import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    // FIX #3: Inject webhook delivery service for retry processing
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWorkflows() {
    this.logger.debug('Running cron job to execute event workflows and reminders');

    try {
      const workflows = await this.prisma.workflow.findMany({
        include: { eventType: true }
      });

      const now = new Date();
      
      for (const workflow of workflows) {
        // timeOffset is in minutes
        const msOffset = (workflow.timeOffset || 0) * 60 * 1000;
        
        let targetStartMin: Date;
        let targetStartMax: Date;
        let timeField: 'startTime' | 'endTime';

        if (workflow.triggerType === 'BEFORE_EVENT') {
          // Target window for meetings starting between (now + offset) and (now + offset + 5 minutes)
          targetStartMin = new Date(now.getTime() + msOffset);
          targetStartMax = new Date(now.getTime() + msOffset + 5 * 60 * 1000);
          timeField = 'startTime';
        } else if (workflow.triggerType === 'AFTER_EVENT') {
          // Target window for meetings ending between (now - offset - 5 minutes) and (now - offset)
          targetStartMin = new Date(now.getTime() - msOffset - 5 * 60 * 1000);
          targetStartMax = new Date(now.getTime() - msOffset);
          timeField = 'endTime';
        } else {
          continue;
        }
        
        const bookings = await this.prisma.booking.findMany({
          where: {
            eventTypeId: workflow.eventTypeId,
            status: 'CONFIRMED',
            [timeField]: {
              gte: targetStartMin,
              lt: targetStartMax,
            }
          }
        });
        
        for (const booking of bookings) {
          try {
            // Attempt to insert into WorkflowExecution to deduplicate
            await this.prisma.workflowExecution.create({
              data: {
                bookingId: booking.id,
                workflowId: workflow.id,
              }
            });

            this.logger.debug(`Executing workflow ${workflow.triggerType} for booking ${booking.id} (${booking.guestEmail})`);
            
            if (workflow.actionType === 'EMAIL') {
              if (workflow.emailSubject || workflow.emailBody) {
                await this.emailService.sendCustomWorkflowEmail(
                  booking.guestEmail,
                  booking.guestName,
                  workflow.eventType.title,
                  booking.startTime.toISOString(),
                  booking.meetLink || undefined,
                  workflow.emailSubject,
                  workflow.emailBody
                ).catch(e => this.logger.error(`Failed to send custom workflow email for booking ${booking.id}: ${e.message}`));
              } else if (workflow.triggerType === 'BEFORE_EVENT') {
                await this.emailService.sendReminderEmail(
                  booking.guestEmail,
                  booking.guestName,
                  workflow.eventType.title,
                  booking.startTime.toISOString(),
                  booking.meetLink || undefined
                ).catch(e => this.logger.error(`Failed to send reminder for booking ${booking.id}: ${e.message}`));
              } else if (workflow.triggerType === 'AFTER_EVENT') {
                await this.emailService.sendFollowUpEmail(
                  booking.guestEmail,
                  booking.guestName,
                  workflow.eventType.title
                ).catch(e => this.logger.error(`Failed to send follow-up for booking ${booking.id}: ${e.message}`));
              }
            }
          } catch (executionError: any) {
            // P2002 is the unique constraint violation code in Prisma
            if (executionError.code === 'P2002') {
              this.logger.debug(`Workflow for booking ${booking.id} and workflow ${workflow.id} already executed. Skipping.`);
            } else {
              this.logger.error(`Error checking workflow execution for booking ${booking.id}: ${executionError.message}`);
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in CronService handleWorkflows: ${error.message}`);
    }
  }

  /**
   * FIX #3: Retry failed webhook deliveries every 5 minutes.
   * Picks up any WebhookDelivery records where success=false, attempts<3, nextAttemptAt<=now.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedWebhooks(): Promise<void> {
    this.logger.debug('Running webhook retry cron');
    await this.webhookDeliveryService.retryFailedDeliveries();
  }
}
