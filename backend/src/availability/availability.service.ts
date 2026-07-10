import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailability(userId: string) {
    let availability = await this.prisma.availability.findUnique({
      where: { userId },
      include: { 
        slots: true,
        overrides: true, 
      },
    });

    if (!availability) {
      availability = await this.prisma.availability.create({
        data: { userId },
        include: { slots: true, overrides: true },
      });
    }

    return availability;
  }

  async setAvailability(userId: string, slots: any[], overrides: any[] = []) {
    const availability = await this.getAvailability(userId);

    // Delete existing slots and overrides
    await this.prisma.availabilitySlot.deleteMany({
      where: { availabilityId: availability.id },
    });
    await this.prisma.availabilityOverride.deleteMany({
      where: { availabilityId: availability.id },
    });

    // Create new overrides
    if (overrides && overrides.length > 0) {
      await this.prisma.availabilityOverride.createMany({
        data: overrides.map(override => ({
          availabilityId: availability.id,
          date: override.date,
          isAvailable: override.isAvailable,
          startTime: override.startTime,
          endTime: override.endTime,
        })),
      });
    }

    // Create new slots
    if (slots && slots.length > 0) {
      await this.prisma.availabilitySlot.createMany({
        data: slots.map(slot => ({
          availabilityId: availability.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    return this.getAvailability(userId);
  }

  async getHostAvailabilityForDate(hostId: string, date: Date) {
    const availability = await this.getAvailability(hostId);
    
    // Check for overrides first
    const dateStr = date.toISOString().split('T')[0];
    const override = availability.overrides.find(o => o.date === dateStr);
    
    if (override) {
      if (!override.isAvailable) return [];
      if (override.startTime && override.endTime) {
        return [{ startTime: override.startTime, endTime: override.endTime }];
      }
    }

    // Fallback to weekly schedule
    const dayOfWeek = date.getDay();
    return availability.slots.filter((s) => s.dayOfWeek === dayOfWeek);
  }
}
