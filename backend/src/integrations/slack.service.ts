import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptToken } from '../common/security/security.util';
import axios from 'axios';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private prisma: PrismaService) {}

  async sendBookingNotification(
    hostId: string,
    guestName: string,
    guestEmail: string,
    startTime: string,
    eventTitle: string,
    meetLink?: string | null,
    locationType?: string | null,
  ) {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: hostId,
            provider: 'slack',
          },
        },
      });

      if (!integration) {
        this.logger.log(
          `No Slack integration found for host ${hostId}. Skipping notification.`,
        );
        return;
      }

      if (integration.autoSync === false) {
        this.logger.log(
          `[SLACK] AutoSync notifications are turned OFF for host ${hostId}. Skipping.`,
        );
        return;
      }

      const tokenOrWebhook = decryptToken(integration.accessToken);
      if (!tokenOrWebhook) {
        this.logger.warn(`Missing or invalid Slack credentials for host ${hostId}.`);
        return;
      }

      // Check whether guest is internal team member or external client
      const host = await this.prisma.user.findUnique({
        where: { id: hostId },
        select: { email: true },
      });

      const hostDomain = host?.email?.split('@')[1]?.toLowerCase().trim();
      const guestDomain = guestEmail?.split('@')[1]?.toLowerCase().trim();
      const publicDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'icloud.com', 'aol.com', 'zoho.com', 'proton.me', 'protonmail.com'
      ];
      const isInternal = Boolean(
        hostDomain &&
        guestDomain &&
        !publicDomains.includes(hostDomain) &&
        hostDomain === guestDomain
      );

      const attendeeBadge = isInternal
        ? '🏢 *Internal Team Member* (Workspace Co-worker)'
        : '🌐 *External Client / Guest*';

      const dateStr = new Date(startTime).toLocaleString();
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: isInternal ? '👥 Internal Team Sync Booked!' : '🎉 New Client Meeting Booked!',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Event:*\n${eventTitle}`,
            },
            {
              type: 'mrkdwn',
              text: `*When:*\n${dateStr}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Guest:*\n${guestName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${guestEmail}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: attendeeBadge,
            },
          ],
        },
      ];

      if (meetLink) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Meeting Location / Link:*\n${meetLink}`,
          },
        });
      }

      if (tokenOrWebhook.startsWith('https://hooks.slack.com/')) {
        await axios.post(tokenOrWebhook, { blocks });
      } else {
        const channel = integration.channelId || '#general';
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          { channel, blocks },
          { headers: { Authorization: `Bearer ${tokenOrWebhook}` } },
        );
      }

      this.logger.log(`[SLACK] Sent booking notification for host ${hostId} (${isInternal ? 'Internal' : 'External'})`);
    } catch (error: any) {
      this.logger.error(
        `[SLACK] Failed to send notification: ${error?.response?.data || error.message}`,
      );
    }
  }

  async sendCancellationNotification(
    hostId: string,
    guestName: string,
    eventTitle: string,
    reason: string,
  ) {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'slack' } },
      });

      if (!integration || integration.autoSync === false) return;

      const tokenOrWebhook = decryptToken(integration.accessToken);
      if (!tokenOrWebhook) return;

      const message = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '❌ Meeting Canceled',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `The meeting *${eventTitle}* with *${guestName}* has been canceled.`,
            },
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `*Reason:* ${reason}` }],
          },
        ],
      };

      if (tokenOrWebhook.startsWith('https://hooks.slack.com/')) {
        await axios.post(tokenOrWebhook, message);
      } else {
        const channel = integration.channelId || '#general';
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          { channel, blocks: message.blocks },
          { headers: { Authorization: `Bearer ${tokenOrWebhook}` } },
        );
      }

      this.logger.log(
        `[SLACK] Sent cancellation notification for host ${hostId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[SLACK] Failed to send cancellation: ${error?.response?.data || error.message}`,
      );
    }
  }
}
