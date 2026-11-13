import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { CalendarService } from '../integrations/calendar.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const clean = email.trim();
    const exact = await this.prisma.user.findUnique({ where: { email: clean } });
    if (exact) return exact;
    return this.prisma.user.findFirst({
      where: { email: { equals: clean, mode: 'insensitive' } },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  private generateRandomCode(length = 6): string {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async generateUniqueShortCode(username?: string | null): Promise<string> {
    if (username && username.includes('-')) {
      const candidate = username.split('-').pop()?.toLowerCase();
      if (candidate && candidate.length >= 4 && candidate.length <= 8) {
        const existing = await this.prisma.profile.findFirst({
          where: { shortCode: candidate },
        });
        if (!existing) return candidate;
      }
    }

    let attempts = 0;
    while (attempts < 10) {
      const code = this.generateRandomCode(6);
      const existing = await this.prisma.profile.findFirst({
        where: { shortCode: code },
      });
      if (!existing) return code;
      attempts++;
    }
    return this.generateRandomCode(8);
  }

  async getProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!profile) return null;

    if (!profile.shortCode) {
      const shortCode = await this.generateUniqueShortCode(profile.username);
      profile = await this.prisma.profile.update({
        where: { id: profile.id },
        data: { shortCode },
        include: { user: { select: { email: true } } },
      });
    }

    return {
      ...profile,
      id: profile.userId,
      profileId: profile.id,
      userId: profile.userId,
      email: profile.user?.email,
    };
  }

  async updateProfile(userId: string, data: any) {
    const { email, ...profileData } = data;

    // Validate unique username if changed
    if (profileData.username) {
      const cleanUsername = profileData.username.trim().toLowerCase();
      const existing = await this.prisma.profile.findFirst({
        where: {
          username: { equals: cleanUsername, mode: 'insensitive' },
          userId: { not: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('This booking URL username is already taken by another user.');
      }
      profileData.username = cleanUsername;
    }

    // Validate unique email if changed
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          id: { not: userId },
        },
      });
      if (existingUser) {
        throw new BadRequestException('This email address is already in use by another account.');
      }
    }

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: profileData,
      include: { user: { select: { email: true } } },
    });

    // Bidirectional sync: keep default Availability schedule timezone aligned with Profile timezone
    if (profileData.timezone) {
      await this.prisma.availability.updateMany({
        where: { userId, isDefault: true },
        data: { timezone: profileData.timezone },
      });
    }

    if (email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: email.trim().toLowerCase() },
      });
    }

    return { ...profile, email: email ? email.trim().toLowerCase() : profile.user?.email };
  }

  async deleteAccount(userId: string) {
    // 1. Find future bookings to cancel external events
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        hostId: userId,
        startTime: { gte: new Date() },
        status: 'CONFIRMED',
      },
    });

    for (const booking of futureBookings) {
      if (booking.externalEventId) {
        await this.calendarService
          .deleteCalendarEvent(userId, booking.externalEventId)
          .catch(() => {});
      }
    }

    // 2. Cascade delete will handle the rest (Tokens, Profile, Bookings, Contacts, Integrations)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }
}
