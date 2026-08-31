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
          // Wait, if an event ended 15 mins ago, and offset is 15 mins, now - offset = end time.
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
              if (workflow.triggerType === 'BEFORE_EVENT') {
                await this.emailService.sendReminderEmail(
                  booking.guestEmail,
                  booking.guestName,
                  workflow.eventType.title,
                  booking.startTime.toISOString(),
                  booking.meetLink || undefined
                ).catch(e => this.logger.error(`Failed to send reminder for booking ${booking.id}: ${e.message}`));
              } else if (workflow.triggerType === 'AFTER_EVENT') {
                // You might have a specific after-event follow-up email.
                // For now, re-using sendReminderEmail or adding a new method?
                // The instructions say "Send email". I'll use a generic or existing email service method.
                // Let's add sendFollowUpEmail to EmailService.
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
}
