import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    this.logger.debug('Running 24h reminder workflow check...');
    const now = new Date();
    // Look for bookings exactly 24 hours from now (with a 5 minute margin to ensure we don't miss any if the cron skips a minute)
    // Actually, it's safer to look for bookings starting in the next 24h + 1min, that haven't had this workflow executed yet.

    const targetTimeMin = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 60000); // 23h 59m
    const targetTimeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60000); // 24h 5m

    const workflows = await this.prisma.workflow.findMany({
      where: {
        triggerType: 'BEFORE_EVENT',
        timeOffset: 1440, // 24 hours
        actionType: 'EMAIL',
      },
      include: {
        eventType: true
      }
    });

    if (workflows.length === 0) return;

    for (const workflow of workflows) {
      const bookings = await this.prisma.booking.findMany({
        where: {
          eventTypeId: workflow.eventTypeId,
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
          startTime: {
            gte: targetTimeMin,
            lte: targetTimeMax,
          },
          workflowExecutions: {
            none: {
              workflowId: workflow.id
            }
          }
        },
        include: {
          host: true,
          eventType: true
        }
      });

      for (const booking of bookings) {
        try {
          // Record execution FIRST to prevent duplicate emails if email taking long
          await this.prisma.workflowExecution.create({
            data: {
              bookingId: booking.id,
              workflowId: workflow.id,
              executedAt: new Date()
            }
          });

          await this.emailService.sendReminderEmail(
            booking.guestEmail,
            booking.guestName,
            booking.eventType.title,
            booking.startTime.toISOString(),
            booking.meetLink || undefined
          ).catch((e: any) => this.logger.error(`Failed to send reminder for booking ${booking.id}: ${e.message}`));

          this.logger.log(`Sent 24h reminder for booking ${booking.id}`);
        } catch (e: any) {
          if (e.code === 'P2002') {
            // Already executed (Unique constraint failed on bookingId_workflowId)
            this.logger.debug(`Workflow already executed for booking ${booking.id}`);
          } else {
            this.logger.error(`Error executing workflow for booking ${booking.id}: ${e.message}`);
          }
        }
      }
    }
  }
}
