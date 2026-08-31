import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { CalendarService } from '../integrations/calendar.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async getProfile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async deleteAccount(userId: string) {
    // 1. Find future bookings to cancel external events
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        hostId: userId,
        startTime: { gte: new Date() },
        status: 'CONFIRMED'
      }
    });

    for (const booking of futureBookings) {
      if (booking.externalEventId) {
        await this.calendarService.deleteCalendarEvent(userId, booking.externalEventId).catch(() => {});
      }
    }

    // 2. Cascade delete will handle the rest (Tokens, Profile, Bookings, Contacts, Integrations)
    await this.prisma.user.delete({
      where: { id: userId }
    });

    return { success: true };
  }
}
