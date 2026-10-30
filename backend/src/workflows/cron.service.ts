import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email.service';
import axios from 'axios';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    const now = new Date();
    const nowTime = now.getTime();

    // Fetch all active automated workflows
    const workflows = await this.prisma.workflow.findMany({
      include: {
        eventType: true,
      },
    });

    if (!workflows || workflows.length === 0) return;

    for (const workflow of workflows) {
      const offsetMinutes = Number(workflow.timeOffset) || 60;
      const offsetMs = offsetMinutes * 60 * 1000;
      const marginMs = 5 * 60 * 1000; // 5 min safety window for cron accuracy

      let targetMin: Date;
      let targetMax: Date;
      let timeField: 'startTime' | 'endTime';

      if (workflow.triggerType === 'AFTER_EVENT') {
        // Event ended around (now - offset)
        timeField = 'endTime';
        targetMin = new Date(nowTime - offsetMs - marginMs);
        targetMax = new Date(nowTime - offsetMs + 60000);
      } else {
        // Default BEFORE_EVENT: Event starts around (now + offset)
        timeField = 'startTime';
        targetMin = new Date(nowTime + offsetMs - 60000);
        targetMax = new Date(nowTime + offsetMs + marginMs);
      }

      const bookings = await this.prisma.booking.findMany({
        where: {
          eventTypeId: workflow.eventTypeId,
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
          [timeField]: {
            gte: targetMin,
            lte: targetMax,
          },
          workflowExecutions: {
            none: {
              workflowId: workflow.id,
            },
          },
        },
        include: {
          host: true,
          eventType: true,
        },
      });

      for (const booking of bookings) {
        try {
          // Record execution FIRST to prevent duplicate delivery
          await this.prisma.workflowExecution.create({
            data: {
              bookingId: booking.id,
              workflowId: workflow.id,
              executedAt: new Date(),
            },
          });

          if (workflow.actionType === 'SMS') {
            await this.dispatchSmsNotification(booking, workflow);
          } else {
            // Default: EMAIL
            if (workflow.emailSubject || workflow.emailBody) {
              await this.emailService.sendCustomWorkflowEmail(
                booking.guestEmail,
                booking.guestName,
                booking.eventType.title,
                booking.startTime.toISOString(),
                booking.meetLink || undefined,
                workflow.emailSubject,
                workflow.emailBody,
              );
            } else if (workflow.triggerType === 'AFTER_EVENT') {
              await this.emailService.sendFollowUpEmail(
                booking.guestEmail,
                booking.guestName,
                booking.eventType.title,
              );
            } else {
              await this.emailService.sendReminderEmail(
                booking.guestEmail,
                booking.guestName,
                booking.eventType.title,
                booking.startTime.toISOString(),
                booking.meetLink || undefined,
              );
            }
          }

          this.logger.log(
            `[Workflow Engine] Successfully executed workflow ${workflow.id} (${workflow.triggerType} ${workflow.timeOffset}m) for booking ${booking.id}`,
          );
        } catch (e: any) {
          if (e.code === 'P2002') {
            // Already executed constraint
            this.logger.debug(`Workflow already executed for booking ${booking.id}`);
          } else {
            this.logger.error(
              `Error executing workflow ${workflow.id} for booking ${booking.id}: ${e.message}`,
            );
          }
        }
      }
    }
  }

  /**
   * Dispatches SMS notification via Twilio REST API if configured, or logs clean debug output.
   */
  private async dispatchSmsNotification(booking: any, workflow: any): Promise<void> {
    const guestPhone = booking.guestPhone;
    if (!guestPhone) {
      this.logger.debug(`Skipping SMS workflow for booking ${booking.id}: guest phone not provided.`);
      return;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    const messageBody = workflow.emailBody ||
      `Reminder: Your meeting "${booking.eventType.title}" is scheduled for ${new Date(booking.startTime).toLocaleString()}. Link: ${booking.meetLink || 'meet.alizesoftwareservices.com'}`;

    if (sid && token && fromPhone) {
      try {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', guestPhone);
        params.append('From', fromPhone);
        params.append('Body', messageBody);

        await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          params.toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        this.logger.log(`[Twilio SMS] Dispatched SMS to ${guestPhone} for booking ${booking.id}`);
      } catch (err: any) {
        this.logger.error(`[Twilio SMS] Failed to dispatch SMS to ${guestPhone}: ${err.message}`);
      }
    } else {
      this.logger.log(`[SMS Gateway Simulated] Sent to ${guestPhone}: "${messageBody}"`);
    }
  }
}
