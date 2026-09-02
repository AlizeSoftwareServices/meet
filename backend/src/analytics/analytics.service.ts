import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardAnalytics(hostId: string, startDate?: string, endDate?: string) {
    const now = new Date();
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) })
    };

    const upcomingMeetings = await this.prisma.booking.count({
      where: {
        hostId,
        status: 'CONFIRMED',
        startTime: { 
          gte: startDate ? new Date(startDate) : now,
          ...(endDate && { lte: new Date(endDate) })
        },
      },
    });

    const completedMeetings = await this.prisma.booking.count({
      where: {
        hostId,
        status: 'CONFIRMED',
        endTime: { 
          lt: now,
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        },
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
        ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter })
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

    // Get bookings per day (for chart)
    let daysToChart = 7;
    let endChartDate = new Date();
    if (endDate) {
      endChartDate = new Date(endDate);
    }
    if (startDate && endDate) {
      const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
      daysToChart = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      // Cap at 30 days for performance/display
      daysToChart = Math.min(daysToChart, 30);
    }

    const chartDates = Array.from({ length: daysToChart }).map((_, i) => {
      const d = new Date(endChartDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const chartData = await Promise.all(chartDates.map(async (date) => {
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
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

  async exportBookingsCsv(hostId: string, startDate?: string, endDate?: string): Promise<string> {
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) })
    };

    const bookings = await this.prisma.booking.findMany({
      where: {
        hostId,
        ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter })
      },
      include: {
        eventType: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    const headers = ['Booking ID', 'Event Type', 'Guest Name', 'Guest Email', 'Status', 'Start Time', 'End Time', 'Created At'];
    const rows = bookings.map(b => [
      b.id,
      b.eventType.title,
      b.guestName,
      b.guestEmail,
      b.status,
      b.startTime.toISOString(),
      b.endTime.toISOString(),
      b.createdAt.toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  async getEventTypeAnalytics(hostId: string, startDate?: string, endDate?: string) {
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) })
    };

    const eventTypes = await this.prisma.eventType.findMany({
      where: { userId: hostId },
      include: {
        bookings: {
          where: {
            hostId,
            ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter })
          },
          select: { status: true }
        }
      }
    });

    return eventTypes.map(et => {
      const total = et.bookings.length;
      const confirmed = et.bookings.filter(b => b.status === 'CONFIRMED').length;
      const cancelled = et.bookings.filter(b => b.status === 'CANCELLED').length;
      const completed = et.bookings.filter(b => b.status === 'COMPLETED').length;
      const noShow = et.bookings.filter(b => b.status === 'NO_SHOW').length;
      return {
        id: et.id,
        title: et.title,
        slug: et.slug,
        color: et.color,
        isActive: et.isActive,
        total,
        confirmed,
        cancelled,
        completed,
        noShow,
        cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      };
    });
  }
}
