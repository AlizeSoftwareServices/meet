import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { CalendarService } from '../integrations/calendar.service';
import { AvailabilityEngineService } from '../availability/availability.engine';

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private availabilityEngine: AvailabilityEngineService,
  ) {}

  async getUserProfile(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        user: {
          include: {
            eventTypes: {
              where: { isActive: true },
              orderBy: { title: 'asc' },
              include: { team: { select: { name: true } } }
            }
          }
        }
      }
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return {
      id: profile.userId,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar,
      bio: profile.bio,
      timezone: profile.timezone,
      company: profile.company,
      brandColor: profile.brandColor,
      bookingPageTitle: profile.bookingPageTitle,
      bookingPageDescription: profile.bookingPageDescription,
      eventTypes: profile.user.eventTypes
    };
  }

    async getAvailableSlots(username: string, eventSlug: string, dateStr: string, guestTimezone?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: true }
    });

    if (!profile) throw new NotFoundException('User not found');

    const eventType = await this.prisma.eventType.findUnique({
      where: { userId_slug: { userId: profile.userId, slug: eventSlug } },
      include: { hosts: true }
    });

    if (!eventType || !eventType.isActive) {
      throw new NotFoundException('Event type not found or inactive');
    }

    const schedule = await this.availabilityEngine.getEffectiveAvailability(profile.userId, eventType.id);
    if (!schedule) {
      return []; // No availability configured
    }

    const hostTimezone = schedule.timezone || profile.timezone || 'UTC';
    const effectiveGuestTimezone = guestTimezone || hostTimezone;

    // 1. Parse guest date in guest timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const guestDate = new Date(year, month - 1, day);
    const guestStartOfDayUTC = fromZonedTime(guestDate, effectiveGuestTimezone);
    const guestEndOfDayUTC = endOfDay(fromZonedTime(guestDate, effectiveGuestTimezone));

    // 2. See what host calendar dates this UTC span covers
    const hostStart = toZonedTime(guestStartOfDayUTC, hostTimezone);
    const hostEnd = toZonedTime(guestEndOfDayUTC, hostTimezone);

    const datesToCheck: string[] = [];
    let currentHostDate = hostStart;
    while (isBefore(currentHostDate, hostEnd) || currentHostDate.getTime() === hostEnd.getTime()) {
      const y = currentHostDate.getFullYear();
      const m = String(currentHostDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentHostDate.getDate()).padStart(2, '0');
      const dateString = `${y}-${m}-${d}`;
      if (!datesToCheck.includes(dateString)) {
        datesToCheck.push(dateString);
      }
      currentHostDate = addMinutes(currentHostDate, 1440); // add 1 day
    }
    
    // Catch the end date just in case
    const yEnd = hostEnd.getFullYear();
    const mEnd = String(hostEnd.getMonth() + 1).padStart(2, '0');
    const dEnd = String(hostEnd.getDate()).padStart(2, '0');
    const endDateString = `${yEnd}-${mEnd}-${dEnd}`;
    if (!datesToCheck.includes(endDateString)) {
      datesToCheck.push(endDateString);
    }

    // Generate potential slots (divided by duration)
    const duration = eventType.duration;
    let potentialSlots: { startTime: Date, endTime: Date }[] = [];

    for (const hostDateStr of datesToCheck) {
      const workingPeriods = this.availabilityEngine.getWorkingPeriodsForDate(hostDateStr, schedule, hostTimezone);
      for (const period of workingPeriods) {
        let current = period.start;
        while (isBefore(addMinutes(current, duration), period.end) || addMinutes(current, duration).getTime() === period.end.getTime()) {
          potentialSlots.push({
            startTime: current,
            endTime: addMinutes(current, duration)
          });
          current = addMinutes(current, duration);
        }
      }
    }

    // Filter to ensure we only evaluate unique slots
    const uniqueSlotsMap = new Map();
    for (const slot of potentialSlots) {
       uniqueSlotsMap.set(slot.startTime.getTime(), slot);
    }
    potentialSlots = Array.from(uniqueSlotsMap.values());

    if (potentialSlots.length === 0) return [];

    // Pass the potential slots through the unified Availability Engine
    const schedulingType = eventType.schedulingType || 'PERSONAL';
    let evaluatedSlots: any[];

    if (schedulingType === 'PERSONAL') {
      evaluatedSlots = await this.availabilityEngine.evaluateSlots(profile.userId, eventType.id, potentialSlots);
    } else {
      const hostIds = eventType.hosts?.map(h => h.userId) || [];
      if (hostIds.length === 0) return [];
      
      const occurrencesToAttempt = potentialSlots.map((s, idx) => ({ ...s, occurrenceNumber: idx + 1 }));
      evaluatedSlots = await this.availabilityEngine.evaluateTeamSlots(
        hostIds, 
        eventType.id, 
        schedulingType as 'ROUND_ROBIN' | 'COLLECTIVE', 
        occurrencesToAttempt
      );
    }

    // Map to frontend expected response and filter by guest's date
    const validSlots = evaluatedSlots
      .filter(s => s.isAvailable)
      .filter(s => {
         // Check if this slot falls on the requested guest date
         const slotGuestZoned = toZonedTime(s.startTime, effectiveGuestTimezone);
         const sY = slotGuestZoned.getFullYear();
         const sM = String(slotGuestZoned.getMonth() + 1).padStart(2, '0');
         const sD = String(slotGuestZoned.getDate()).padStart(2, '0');
         const slotGuestDateStr = `${sY}-${sM}-${sD}`;
         return slotGuestDateStr === dateStr;
      })
      .map(s => {
         return {
           startTime: s.startTime.toISOString(),
           endTime: s.endTime.toISOString(),
           spotsRemaining: eventType.isGroupEvent ? eventType.maxInvitees : 1
         };
      });

    return validSlots;
  }

  private createZonedDate(dateStr: string, timeStr: string, timeZone: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Create local representation
    const localDate = new Date(year, month - 1, day, hours, minutes);
    return fromZonedTime(localDate, timeZone);
  }
}
