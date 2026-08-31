import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates HMAC-SHA256 signature for the given payload string and webhook secret.
   */
  generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Dispatches an event to all active webhooks registered by the user that subscribe to this event.
   * Asynchronous and non-blocking: Never throws an error to the caller.
   */
  async dispatch(userId: string, event: string, data: any, bookingId?: string): Promise<void> {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          userId,
          isActive: true,
          events: { has: event },
        },
      });

      if (!webhooks || webhooks.length === 0) {
        return;
      }

      const timestamp = new Date().toISOString();
      const payloadObj = {
        id: `evt_${crypto.randomBytes(12).toString('hex')}`,
        event,
        createdAt: timestamp,
        data,
      };
      const payloadString = JSON.stringify(payloadObj);

      for (const webhook of webhooks) {
        // Create delivery record
        const delivery = await this.prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            bookingId: bookingId || null,
            payload: payloadString,
            attempts: 0,
            success: false,
          },
        });

        // Fire-and-forget delivery in background
        this.attemptDelivery(webhook, delivery.id, payloadString, event).catch((err) => {
          this.logger.warn(`Background delivery failure for webhook ${webhook.id}: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch webhook event ${event} for user ${userId}: ${err.message}`);
    }
  }

  /**
   * Sends the HTTP POST to the webhook endpoint with HMAC signature and records the result.
   */
  async attemptDelivery(webhook: any, deliveryId: string, payloadString: string, event: string): Promise<boolean> {
    const signature = this.generateSignature(payloadString, webhook.secret);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Meet-Webhooks/1.0',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Event': event,
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Timestamp': new Date().toISOString(),
    };

    let statusCode: number | null = null;
    let responseText: string | null = null;
    let isSuccess = false;

    try {
      const res = await axios.post(webhook.url, payloadString, {
        headers,
        timeout: 5000,
        validateStatus: () => true, // Don't throw on non-2xx status codes
      });

      statusCode = res.status;
      responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      if (responseText && responseText.length > 2000) {
        responseText = responseText.substring(0, 2000) + '...[truncated]';
      }
      isSuccess = statusCode >= 200 && statusCode < 300;
    } catch (err: any) {
      statusCode = err.response?.status || 0;
      responseText = err.message || 'Connection failed';
      isSuccess = false;
    }

    try {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          statusCode,
          response: responseText,
          success: isSuccess,
          attempts: { increment: 1 },
          deliveredAt: new Date(),
          nextAttemptAt: isSuccess ? null : new Date(Date.now() + 60000), // Retry in 1 min if failed
        },
      });
    } catch (dbErr: any) {
      this.logger.error(`Failed to update delivery status ${deliveryId}: ${dbErr.message}`);
    }

    return isSuccess;
  }
}
