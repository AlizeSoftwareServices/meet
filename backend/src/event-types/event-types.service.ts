import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventTypeDto) {
    return this.prisma.eventType.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.eventType.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: { id, userId },
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
      }
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    return eventType;
  }
  async update(id: string, userId: string, dto: any) {
    // Verify ownership
    await this.findOne(id, userId);
    return this.prisma.eventType.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);
    return this.prisma.eventType.delete({
      where: { id },
    });
  }
}
