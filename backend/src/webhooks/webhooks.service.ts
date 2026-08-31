import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookDeliveryService } from './webhook-delivery.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  async create(userId: string, dto: CreateWebhookDto) {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        url: dto.url,
        secret,
        events: dto.events,
        isActive: dto.isActive ?? true,
      },
    });

    return webhook;
  }

  async findAll(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return webhooks.map((wh) => ({
      ...wh,
      lastDelivery: wh.deliveries[0] || null,
    }));
  }

  async findOne(userId: string, id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException('You do not have access to this webhook');
    }

    return webhook;
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    const webhook = await this.findOne(userId, id);

    return this.prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        ...(dto.url ? { url: dto.url } : {}),
        ...(dto.events ? { events: dto.events } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    const webhook = await this.findOne(userId, id);

    await this.prisma.webhook.delete({
      where: { id: webhook.id },
    });

    return { success: true, message: 'Webhook deleted successfully' };
  }

  async getDeliveries(userId: string, id: string) {
    await this.findOne(userId, id); // Enforce ownership / IDOR check

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async testWebhook(userId: string, id: string) {
    const webhook = await this.findOne(userId, id);

    const testPayload = {
      test: true,
      message: 'This is a test webhook event from Meet.',
      triggeredAt: new Date().toISOString(),
    };

    const payloadObj = {
      id: `evt_test_${crypto.randomBytes(8).toString('hex')}`,
      event: 'webhook.test',
      createdAt: new Date().toISOString(),
      data: testPayload,
    };
    const payloadString = JSON.stringify(payloadObj);

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: 'webhook.test',
        payload: payloadString,
        attempts: 0,
        success: false,
      },
    });

    const success = await this.deliveryService.attemptDelivery(
      webhook,
      delivery.id,
      payloadString,
      'webhook.test',
    );

    const updatedDelivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    });

    return {
      success,
      delivery: updatedDelivery,
    };
  }
}
