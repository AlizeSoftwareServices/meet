import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    const { enableReminder24h, ...data } = dto;
    const eventType = await this.prisma.eventType.create({
      data: {
        ...data,
        userId,
      },
    });

    if (enableReminder24h) {
      await this.prisma.workflow.create({
        data: {
          eventTypeId: eventType.id,
          triggerType: 'BEFORE_EVENT',
          timeOffset: 1440, // 24 hours
          actionType: 'EMAIL',
        },
      });
    }

    return eventType;
  }

  async findAllForUser(userId: string) {
    return this.prisma.eventType.findMany({
      where: { userId },
      include: { workflows: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: { id, userId },
      include: { workflows: true },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }

    return eventType;
  }

  async findBySlugAndHost(slug: string, hostId: string) {
    const eventType = await this.prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: hostId,
          slug,
        }
      },
      include: { workflows: true },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    return eventType;
  }

  async update(id: string, userId: string, dto: any) {
    // Verify ownership
    await this.findOne(id, userId);
    const { enableReminder24h, ...data } = dto;

    const eventType = await this.prisma.eventType.update({
      where: { id },
      data: data,
    });

    if (enableReminder24h !== undefined) {
      if (enableReminder24h) {
        const existing = await this.prisma.workflow.findFirst({
          where: { eventTypeId: id, triggerType: 'BEFORE_EVENT', timeOffset: 1440 }
        });
        if (!existing) {
          await this.prisma.workflow.create({
            data: {
              eventTypeId: id,
              triggerType: 'BEFORE_EVENT',
              timeOffset: 1440,
              actionType: 'EMAIL',
            }
          });
        }
      } else {
        await this.prisma.workflow.deleteMany({
          where: { eventTypeId: id, triggerType: 'BEFORE_EVENT', timeOffset: 1440 }
        });
      }
    }

    return eventType;
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);
    return this.prisma.eventType.delete({
      where: { id },
    });
  }
}
