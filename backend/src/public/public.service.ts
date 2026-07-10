import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        user: {
          include: {
            eventTypes: {
              where: { isActive: true },
              orderBy: { title: 'asc' }
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
      where: { userId_slug: { userId: profile.userId, slug: eventSlug } }
    });

    if (!eventType || !eventType.isActive) {
      throw new NotFoundException('Event type not found or inactive');
    }

    const availability = await this.prisma.availability.findUnique({
      where: { userId: profile.userId },
      include: { slots: true, overrides: true }
    });

    if (!availability) {
      return []; // No availability configured
    }

    const hostTimezone = profile.timezone || 'UTC';
    
    // Determine working hours for the date in the HOST'S timezone.
    // dateStr is 'YYYY-MM-DD'.
    
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create a Date object representing midnight in the host's timezone
    const hostDate = fromZonedTime(new Date(year, month - 1, day), hostTimezone);
    const dayOfWeek = toZonedTime(hostDate, hostTimezone).getDay();

    const override = availability.overrides.find(o => o.date === dateStr);
    let workingPeriods: { start: Date, end: Date }[] = [];

    if (override) {
      if (override.isAvailable && override.startTime && override.endTime) {
        workingPeriods.push({
          start: this.createZonedDate(dateStr, override.startTime, hostTimezone),
          end: this.createZonedDate(dateStr, override.endTime, hostTimezone)
        });
      }
    } else {
      const daySlots = availability.slots.filter(s => s.dayOfWeek === dayOfWeek);
      for (const slot of daySlots) {
        workingPeriods.push({
          start: this.createZonedDate(dateStr, slot.startTime, hostTimezone),
          end: this.createZonedDate(dateStr, slot.endTime, hostTimezone)
        });
      }
    }

    if (workingPeriods.length === 0) return [];

    // Generate potential slots (divided by duration)
    const duration = eventType.duration;
    const bufferBefore = eventType.bufferBefore || 0;
    const bufferAfter = eventType.bufferAfter || 0;
    
    let potentialSlots: { startTime: Date, endTime: Date }[] = [];

    for (const period of workingPeriods) {
      let current = period.start;
      while (isBefore(addMinutes(current, duration), period.end) || addMinutes(current, duration).getTime() === period.end.getTime()) {
        potentialSlots.push({
          startTime: current,
          endTime: addMinutes(current, duration)
        });
        current = addMinutes(current, duration); // simple strict slotting (e.g. 09:00, 09:30, 10:00)
      }
    }

    // Fetch existing bookings for this host on this day
    const dayStart = startOfDay(hostDate);
    const dayEnd = endOfDay(hostDate);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        hostId: profile.userId,
        status: 'CONFIRMED',
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd }
      }
    });

    const now = new Date();

    // Filter out past slots and conflicting slots
    const availableSlots = potentialSlots.filter(slot => {
      // 1. Must be in the future (considering minNotice if we had it, for now just > now)
      if (isBefore(slot.startTime, now)) return false;

      // 2. Check overlap with existing bookings (including buffers)
      const slotStartWithBuffer = addMinutes(slot.startTime, -bufferBefore);
      const slotEndWithBuffer = addMinutes(slot.endTime, bufferAfter);

      for (const booking of existingBookings) {
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;

        // Condition for overlap: slotStart < bookingEnd AND slotEnd > bookingStart
        if (isBefore(slotStartWithBuffer, bookingEnd) && isAfter(slotEndWithBuffer, bookingStart)) {
          return false;
        }
      }

      return true;
    });

    // Return slots as ISO strings
    return availableSlots.map(s => ({
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));
  }

  private createZonedDate(dateStr: string, timeStr: string, timeZone: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Create local representation
    const localDate = new Date(year, month - 1, day, hours, minutes);
    return fromZonedTime(localDate, timeZone);
  }
}
