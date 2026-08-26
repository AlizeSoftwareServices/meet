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

  @Cron(CronExpression.EVERY_HOUR)
  async handleWorkflows() {
    this.logger.debug('Running cron job to execute event workflows and reminders');

    try {
      const workflows = await this.prisma.workflow.findMany({
        include: { eventType: true }
      });

      const now = new Date();
      
      for (const workflow of workflows) {
        if (workflow.triggerType === 'BEFORE_EVENT') {
          // timeOffset is in minutes (e.g. 1440 for 24 hours, 60 for 1 hour)
          const msOffset = (workflow.timeOffset || 1440) * 60 * 1000;
          
          // Target window for meetings starting between (now + offset) and (now + offset + 1 hour)
          const targetStartMin = new Date(now.getTime() + msOffset);
          const targetStartMax = new Date(now.getTime() + msOffset + 60 * 60 * 1000);
          
          const bookings = await this.prisma.booking.findMany({
            where: {
              eventTypeId: workflow.eventTypeId,
              status: 'CONFIRMED',
              startTime: {
                gte: targetStartMin,
                lt: targetStartMax,
              }
            }
          });
          
          for (const booking of bookings) {
            this.logger.debug(`Executing reminder workflow for booking ${booking.id} (${booking.guestEmail})`);
            await this.emailService.sendReminderEmail(
              booking.guestEmail,
              booking.guestName,
              workflow.eventType.title,
              booking.startTime.toISOString(),
              booking.meetLink || undefined
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in CronService handleWorkflows: ${error.message}`);
    }
  }
}
