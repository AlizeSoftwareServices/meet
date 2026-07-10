import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics(hostId: string) {
    const now = new Date();

    const upcomingMeetings = await this.prisma.booking.count({
      where: {
        hostId,
        status: 'CONFIRMED',
        startTime: { gte: now },
      },
    });

    const completedMeetings = await this.prisma.booking.count({
      where: {
        hostId,
        status: 'CONFIRMED',
        endTime: { lt: now },
      },
    });

    const activeEventTypes = await this.prisma.eventType.count({
      where: {
        userId: hostId,
        isActive: true,
      },
    });

    // Calculate total hours booked
    const allBookings = await this.prisma.booking.findMany({
      where: {
        hostId,
        status: 'CONFIRMED',
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const totalHoursBooked = allBookings.reduce((total, booking) => {
      const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
      return total + (durationMs / (1000 * 60 * 60));
    }, 0);

    // Get bookings per day for the last 7 days (for chart)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const chartData = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const count = await this.prisma.booking.count({
        where: {
          hostId,
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: count,
      };
    }));

    const totalContacts = await this.prisma.contact.count({
      where: { hostId }
    });

    return {
      stats: [
        { title: 'Upcoming Meetings', value: upcomingMeetings.toString() },
        { title: 'Completed Meetings', value: completedMeetings.toString() },
        { title: 'Total Contacts', value: totalContacts.toString() },
        { title: 'Total Hours Booked', value: totalHoursBooked.toFixed(1) },
      ],
      chartData,
    };
  }
}
