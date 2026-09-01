import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getSchedules(userId: string) {
    let schedules = await this.prisma.availability.findMany({
      where: { userId },
      include: { slots: true, overrides: true }
    });
    if (schedules.length === 0) {
      const created = await this.prisma.availability.create({
        data: { userId, name: 'Working Hours', isDefault: true },
      });
      // Add default slots for Mon-Fri
      const defaultSlots = [1, 2, 3, 4, 5].map(day => ({
        availabilityId: created.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00'
      }));
      await this.prisma.availabilitySlot.createMany({ data: defaultSlots });
      
      const fullCreated = await this.prisma.availability.findUnique({
        where: { id: created.id },
        include: { slots: true, overrides: true }
      });
      schedules = [fullCreated as any];
    }
    return schedules;
  }

  async getSchedule(userId: string, id: string) {
    const schedule = await this.prisma.availability.findUnique({
      where: { id },
      include: { slots: true, overrides: true }
    });
    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }
    return schedule;
  }

  async createSchedule(userId: string, name: string) {
    return this.prisma.availability.create({
      data: { userId, name, isDefault: false },
      include: { slots: true, overrides: true }
    });
  }

  async updateSchedule(userId: string, id: string, name: string, isDefault: boolean, timezone: string, slots: any[], overrides: any[]) {
    const schedule = await this.getSchedule(userId, id);

    if (isDefault && !schedule.isDefault) {
      // Unset previous defaults
      await this.prisma.availability.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    await this.prisma.$transaction([
      this.prisma.availabilitySlot.deleteMany({ where: { availabilityId: id } }),
      this.prisma.availabilityOverride.deleteMany({ where: { availabilityId: id } }),
    ]);

    let dataToUpdate: any = { name, isDefault, timezone };

    await this.prisma.availability.update({
      where: { id },
      data: dataToUpdate
    });

    if (slots && slots.length > 0) {
      await this.prisma.availabilitySlot.createMany({
        data: slots.map(slot => ({
          availabilityId: id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    if (overrides && overrides.length > 0) {
      await this.prisma.availabilityOverride.createMany({
        data: overrides.map(override => ({
          availabilityId: id,
          date: override.date,
          isAvailable: override.isAvailable,
          startTime: override.startTime,
          endTime: override.endTime,
        })),
      });
    }

    return this.getSchedule(userId, id);
  }

  async deleteSchedule(userId: string, id: string) {
    const schedule = await this.getSchedule(userId, id);
    if (schedule.isDefault) {
      throw new BadRequestException('Cannot delete the default schedule');
    }
    await this.prisma.availability.delete({ where: { id } });
    return { success: true };
  }

  // Backward compatibility for existing single PUT /availability logic
  async getAvailability(userId: string) {
    let availability = await this.prisma.availability.findFirst({
      where: { userId, isDefault: true },
      include: { slots: true, overrides: true },
    });
    if (!availability) {
      availability = await this.prisma.availability.findFirst({
        where: { userId },
        include: { slots: true, overrides: true }
      });
    }
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
    return this.updateSchedule(userId, availability.id, availability.name, true, availability.timezone, slots, overrides);
  }
}
