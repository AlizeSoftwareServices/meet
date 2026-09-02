import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../integrations/calendar.service';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addMinutes, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';

@Injectable()
export class AvailabilityEngineService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
  ) {}

  public async getEffectiveAvailability(hostId: string, eventTypeId?: string) {
    let schedule: any = null;
    if (eventTypeId) {
      const eventType = await this.prisma.eventType.findUnique({
        where: { id: eventTypeId },
        include: { availability: { include: { slots: true, overrides: true } } }
      });
      if (eventType && eventType.availability) {
        schedule = eventType.availability;
      }
    }

    if (!schedule) {
      schedule = await this.prisma.availability.findFirst({
        where: { userId: hostId, isDefault: true },
        include: { slots: true, overrides: true }
      });
    }

    if (!schedule) {
      schedule = await this.prisma.availability.findFirst({
        where: { userId: hostId },
        include: { slots: true, overrides: true }
      });
    }

    return schedule;
  }

  private createZonedDate(dateStr: string, timeStr: string, timezone: string): Date {
    return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
  }

  public getWorkingPeriodsForDate(dateStr: string, schedule: any, timezone: string) {
    const dayOfWeek = toZonedTime(fromZonedTime(`${dateStr}T12:00:00`, timezone), timezone).getDay();

    const dateOverrides = schedule.overrides.filter((o: any) => o.date === dateStr);
    
    let workingPeriods: { start: Date, end: Date }[] = [];

    if (dateOverrides.length > 0) {
      for (const override of dateOverrides) {
        if (override.isAvailable && override.startTime && override.endTime) {
          workingPeriods.push({
            start: this.createZonedDate(dateStr, override.startTime, timezone),
            end: this.createZonedDate(dateStr, override.endTime, timezone)
          });
        }
      }
    } else {
      const daySlots = schedule.slots.filter((s: any) => s.dayOfWeek === dayOfWeek);
      for (const slot of daySlots) {
        workingPeriods.push({
          start: this.createZonedDate(dateStr, slot.startTime, timezone),
          end: this.createZonedDate(dateStr, slot.endTime, timezone)
        });
      }
    }

    workingPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());
    const normalized: { start: Date, end: Date }[] = [];
    
    for (const period of workingPeriods) {
      if (normalized.length === 0) {
        normalized.push(period);
      } else {
        const last = normalized[normalized.length - 1];
        if (period.start <= last.end) {
          if (period.end > last.end) {
             last.end = period.end;
          }
        } else {
          normalized.push(period);
        }
      }
    }

    return normalized;
  }

  public async evaluateSlots(
    hostId: string, 
    eventTypeId: string, 
    requestedSlots: any[]
  ): Promise<any[]> {
    
    if (requestedSlots.length === 0) return [];

    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      include: { profile: true }
    });
    if (!host) throw new NotFoundException('Host not found');

    const eventType = eventTypeId 
      ? await this.prisma.eventType.findUnique({ where: { id: eventTypeId } })
      : null;

    const schedule = await this.getEffectiveAvailability(hostId, eventTypeId);
    if (!schedule) throw new BadRequestException('Host has no availability schedule configured.');

    const timezone = schedule.timezone || host.profile?.timezone || 'UTC';
    const duration = eventType?.duration || 30;
    const bufferBefore = eventType?.bufferBefore || 0;
    const bufferAfter = eventType?.bufferAfter || 0;
    const minNotice = eventType?.minNotice || 0;
    const maxAdvanceDays = eventType?.maxAdvanceDays || 60;

    const now = new Date();
    const nowHost = toZonedTime(now, timezone);
    const futureHost = addDays(nowHost, maxAdvanceDays);
    const maxAdvanceDateHost = endOfDay(futureHost);
    const maxAdvanceDate = fromZonedTime(maxAdvanceDateHost, timezone);

    const minTime = new Date(Math.min(...requestedSlots.map(s => s.startTime.getTime())));
    const maxTime = new Date(Math.max(...requestedSlots.map(s => s.endTime.getTime())));

    const searchStart = startOfDay(fromZonedTime(toZonedTime(minTime, timezone), timezone));
    const searchEnd = endOfDay(fromZonedTime(toZonedTime(maxTime, timezone), timezone));

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        OR: [
          { hostId: hostId },
          { assignedHosts: { some: { userId: hostId } } }
        ],
        startTime: { gte: addMinutes(searchStart, -1440) },
        endTime: { lte: addMinutes(searchEnd, 1440) }
      },
      include: { eventType: true }
    });

    const externalBusyPeriods = await this.calendarService.getBusyPeriods(
      hostId,
      addMinutes(searchStart, -1440).toISOString(),
      addMinutes(searchEnd, 1440).toISOString()
    );

    const results: any[] = [];

    for (const slot of requestedSlots) {
      let isAvailable = true;
      let reason = '';

      if (isBefore(slot.startTime, addMinutes(now, minNotice))) {
        isAvailable = false;
        reason = `Minimum scheduling notice is ${minNotice} minutes.`;
      }
      if (isAvailable && isBefore(maxAdvanceDate, slot.startTime)) {
        isAvailable = false;
        reason = `Cannot schedule more than ${maxAdvanceDays} days in advance.`;
      }

      if (isAvailable) {
        const zonedSlotStart = toZonedTime(slot.startTime, timezone);
        const y = zonedSlotStart.getFullYear();
        const m = String(zonedSlotStart.getMonth() + 1).padStart(2, '0');
        const d = String(zonedSlotStart.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const workingPeriods = this.getWorkingPeriodsForDate(dateStr, schedule, timezone);
        
        const isWithinWorkingHours = workingPeriods.some(p => 
          (slot.startTime.getTime() >= p.start.getTime()) && 
          (slot.endTime.getTime() <= p.end.getTime())
        );

        if (!isWithinWorkingHours) {
          isAvailable = false;
          reason = 'Slot is outside host working hours.';
        } else if (eventType?.maxDailyBookings && eventType.maxDailyBookings > 0) {
          // maxDailyBookings enforcement based on host timezone calendar date
          const sameDayBookingsCount = existingBookings.filter(b => {
            if (b.eventTypeId !== eventTypeId) return false;
            if (b.status !== 'CONFIRMED') return false;
            
            const zonedStart = toZonedTime(b.startTime, timezone);
            const bY = zonedStart.getFullYear();
            const bM = String(zonedStart.getMonth() + 1).padStart(2, '0');
            const bD = String(zonedStart.getDate()).padStart(2, '0');
            const bDateStr = `${bY}-${bM}-${bD}`;
            
            return bDateStr === dateStr;
          }).length;

          if (sameDayBookingsCount >= eventType.maxDailyBookings) {
            isAvailable = false;
            reason = 'Daily booking limit reached.';
          }
        }
      }

      // 3. Overlaps with internal bookings
      if (isAvailable) {
        const slotStartWithBuffer = addMinutes(slot.startTime, -bufferBefore);
        const slotEndWithBuffer = addMinutes(slot.endTime, bufferAfter);

        if (eventType?.isGroupEvent) {
          // Count existing bookings for this specific group event
          const groupBookingsCount = existingBookings.filter(b => 
            b.eventTypeId === eventTypeId && 
            b.startTime.getTime() === slot.startTime.getTime() && 
            b.endTime.getTime() === slot.endTime.getTime()
          ).length;

          if (eventType.maxInvitees && groupBookingsCount >= eventType.maxInvitees) {
            isAvailable = false;
            reason = 'Group event slot is full.';
          } else {
            // Check if host is busy with ANOTHER event entirely
            const otherOverlap = existingBookings.find(b => {
              if (b.eventTypeId === eventTypeId) return false;
              const bBufferBefore = b.eventType?.bufferBefore || 0;
              const bBufferAfter = b.eventType?.bufferAfter || 0;
              const bStart = addMinutes(b.startTime, -bBufferBefore);
              const bEnd = addMinutes(b.endTime, bBufferAfter);
              return bStart.getTime() < slotEndWithBuffer.getTime() && bEnd.getTime() > slotStartWithBuffer.getTime();
            });
            if (otherOverlap) {
              isAvailable = false;
              reason = 'Host is busy with another event.';
            }
          }
        } else {
          // Standard 1-on-1 overlap
          const overlap = existingBookings.find(b => {
            const bBufferBefore = b.eventType?.bufferBefore || 0;
            const bBufferAfter = b.eventType?.bufferAfter || 0;
            const bStart = addMinutes(b.startTime, -bBufferBefore);
            const bEnd = addMinutes(b.endTime, bBufferAfter);
            return bStart.getTime() < slotEndWithBuffer.getTime() && bEnd.getTime() > slotStartWithBuffer.getTime();
          });
          if (overlap) {
            isAvailable = false;
            reason = 'Time slot is no longer available.';
          }
        }
      }

      // 4. Overlaps with External Google Calendar
      if (isAvailable && externalBusyPeriods && externalBusyPeriods.length > 0) {
        const slotStartWithBuffer = addMinutes(slot.startTime, -bufferBefore);
        const slotEndWithBuffer = addMinutes(slot.endTime, bufferAfter);

        const externalOverlap = externalBusyPeriods.find((busy: any) => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          return (busyStart < slotEndWithBuffer.getTime() && busyEnd > slotStartWithBuffer.getTime());
        });

        if (externalOverlap) {
          isAvailable = false;
          reason = 'Host is busy in their external calendar.';
        }
      }

      results.push({
        ...slot,
        isAvailable,
        reason
      });
    }

    return results;
  }

  public async evaluateTeamSlots(
    hostIds: string[],
    eventTypeId: string,
    schedulingType: string,
    requestedSlots: any[]
  ): Promise<any[]> {
    if (requestedSlots.length === 0) return [];
    if (hostIds.length === 0) return requestedSlots.map(s => ({ ...s, isAvailable: false, reason: 'No hosts provided' }));

    const hostResults = await Promise.all(
      hostIds.map(hostId => this.evaluateSlots(hostId, eventTypeId, requestedSlots))
    );

    const mergedResults: any[] = [];

    for (let i = 0; i < requestedSlots.length; i++) {
      const slot = requestedSlots[i];
      let isAvailable = false;
      let reason = 'Unavailable';
      let availableHostIds: string[] = [];

      for (let j = 0; j < hostIds.length; j++) {
        const hostSlotResult = hostResults[j][i];
        if (hostSlotResult.isAvailable) {
          availableHostIds.push(hostIds[j]);
        }
      }

      if (schedulingType === 'ROUND_ROBIN') {
        if (availableHostIds.length > 0) {
          isAvailable = true;
          reason = '';
        } else {
          reason = 'No eligible host is available for this slot.';
        }
      } else if (schedulingType === 'COLLECTIVE') {
        if (availableHostIds.length === hostIds.length) {
          isAvailable = true;
          reason = '';
        } else {
          reason = 'One or more required hosts are unavailable.';
        }
      } else {
        // PERSONAL / 1-on-1 single host
        if (availableHostIds.length > 0) {
          isAvailable = true;
          reason = '';
        } else {
          reason = hostResults[0]?.[i]?.reason || 'Host is unavailable.';
        }
      }

      mergedResults.push({
        ...slot,
        isAvailable,
        reason,
        availableHostIds // Needed for downstream assignment
      });
    }

    return mergedResults;
  }
}
