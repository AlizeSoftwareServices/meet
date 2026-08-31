import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWorkflowDto: CreateWorkflowDto) {
    // Verify ownership of the event type
    const eventType = await this.prisma.eventType.findFirst({
      where: { id: createWorkflowDto.eventTypeId, userId },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found or unauthorized');
    }

    return this.prisma.workflow.create({
      data: createWorkflowDto,
    });
  }

  async findAllByEventType(userId: string, eventTypeId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: { id: eventTypeId, userId },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found or unauthorized');
    }

    return this.prisma.workflow.findMany({
      where: { eventTypeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { eventType: true },
    });

    if (!workflow || workflow.eventType.userId !== userId) {
      throw new NotFoundException('Workflow not found or unauthorized');
    }

    return workflow;
  }

  async update(userId: string, id: string, updateWorkflowDto: UpdateWorkflowDto) {
    await this.findOne(userId, id); // validates ownership

    return this.prisma.workflow.update({
      where: { id },
      data: updateWorkflowDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // validates ownership

    return this.prisma.workflow.delete({
      where: { id },
    });
  }
}
