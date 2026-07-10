import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Run every hour at the 0th minute
  @Cron(CronExpression.EVERY_HOUR)
  async handleUpcomingBookingsReminders() {
    this.logger.debug('Running cron job to find upcoming bookings in 24 hours');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: {
          gte: in24Hours,
          lt: in25Hours,
        },
      },
      include: {
        eventType: true,
      },
    });

    for (const booking of upcomingBookings) {
      this.logger.debug(`Sending reminder for booking ${booking.id}`);
      await this.emailService.sendBookingConfirmation(
        booking.guestEmail,
        booking.guestName,
        `REMINDER: ${booking.eventType.title}`,
        booking.startTime.toISOString()
      );
    }
  }
}
