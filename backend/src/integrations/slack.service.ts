import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private prisma: PrismaService) {}

  async sendBookingNotification(hostId: string, guestName: string, guestEmail: string, startTime: string, eventTitle: string) {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: hostId,
            provider: 'slack'
          }
        }
      });

      if (!integration) {
        this.logger.log(`No Slack integration found for host ${hostId}. Skipping notification.`);
        return;
      }

      // We expect accessToken to be a Slack Incoming Webhook URL in this simple implementation
      const webhookUrl = integration.accessToken;
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        this.logger.warn(`Invalid Slack webhook URL for host ${hostId}.`);
        return;
      }

      const dateStr = new Date(startTime).toLocaleString();
      const message = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎉 New Meeting Booked!",
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Event:*\n${eventTitle}`
              },
              {
                type: "mrkdwn",
                text: `*When:*\n${dateStr}`
              }
            ]
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Guest:*\n${guestName}`
              },
              {
                type: "mrkdwn",
                text: `*Email:*\n${guestEmail}`
              }
            ]
          }
        ]
      };

      await axios.post(webhookUrl, message);
      this.logger.log(`[SLACK] Sent booking notification for host ${hostId}`);
    } catch (error) {
      this.logger.error(`[SLACK] Failed to send notification: ${error.message}`);
    }
  }

  async sendCancellationNotification(hostId: string, guestName: string, eventTitle: string, reason: string) {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'slack' } }
      });

      if (!integration || !integration.accessToken.startsWith('https://hooks.slack.com/')) return;

      const message = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "❌ Meeting Canceled", emoji: true }
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `The meeting *${eventTitle}* with *${guestName}* has been canceled.` }
          },
          {
            type: "context",
            elements: [ { type: "mrkdwn", text: `*Reason:* ${reason}` } ]
          }
        ]
      };

      await axios.post(integration.accessToken, message);
      this.logger.log(`[SLACK] Sent cancellation notification for host ${hostId}`);
    } catch (error) {
      this.logger.error(`[SLACK] Failed to send cancellation: ${error.message}`);
    }
  }
}
