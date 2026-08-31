import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@Injectable()
export class PollsService {
  constructor(private prisma: PrismaService) {}

  async createPoll(hostId: string, dto: CreatePollDto) {
    if (!dto.slots || dto.slots.length === 0) {
      throw new BadRequestException('At least one slot is required');
    }

    return this.prisma.poll.create({
      data: {
        hostId,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        slots: {
          create: dto.slots.map(s => ({
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime)
          }))
        }
      },
      include: {
        slots: true
      }
    });
  }

  async getHostPolls(hostId: string) {
    return this.prisma.poll.findMany({
      where: { hostId },
      include: {
        slots: {
          include: {
            votes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPollById(id: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            votes: true
          }
        },
        host: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return poll;
  }

  async vote(pollId: string, dto: VotePollDto) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { slots: true }
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== 'OPEN') {
      throw new BadRequestException('Poll is closed');
    }

    const slot = poll.slots.find(s => s.id === dto.pollSlotId);
    if (!slot) {
      throw new BadRequestException('Invalid slot ID for this poll');
    }

    // Upsert vote (one vote per email per slot)
    const existingVote = await this.prisma.pollVote.findFirst({
      where: {
        pollSlotId: dto.pollSlotId,
        guestEmail: dto.guestEmail
      }
    });

    if (existingVote) {
      return this.prisma.pollVote.update({
        where: { id: existingVote.id },
        data: {
          guestName: dto.guestName,
          status: dto.status
        }
      });
    }

    try {
      return await this.prisma.pollVote.create({
        data: {
          pollSlotId: dto.pollSlotId,
          guestName: dto.guestName,
          guestEmail: dto.guestEmail,
          status: dto.status
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('You have already voted on this slot concurrently.');
      }
      throw error;
    }
  }

  async closePoll(hostId: string, pollId: string) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } });
    
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.hostId !== hostId) throw new BadRequestException('Unauthorized');

    return this.prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED' }
    });
  }
}
