import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../integrations/calendar.service';
import { EmailService } from '../integrations/email.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@Injectable()
export class PollsService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private emailService: EmailService,
  ) {}

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

  async finalizePoll(hostId: string, pollId: string, slotId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        slots: {
          include: { votes: true }
        },
        host: {
          include: { profile: true }
        }
      }
    });

    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.hostId !== hostId) throw new BadRequestException('Unauthorized');

    const winningSlot = poll.slots.find(s => s.id === slotId);
    if (!winningSlot) throw new BadRequestException('Invalid winning slot selected');

    // Get all attendees who voted YES or IF_NEED_BE
    const eligibleVotes = winningSlot.votes.filter(v => v.status === 'YES' || v.status === 'IF_NEED_BE');

    // Create Calendar Event & Meeting link if calendar is integrated
    let meetLink: string | null = null;
    let externalEventId: string | null = null;
    try {
      const calRes = await this.calendarService.createCalendarEvent(
        hostId,
        poll.title,
        winningSlot.startTime.toISOString(),
        winningSlot.endTime.toISOString(),
        eligibleVotes[0]?.guestEmail || 'attendee@example.com',
        eligibleVotes[0]?.guestName || 'Meeting Attendee'
      );
      if (calRes) {
        meetLink = calRes.meetLink;
        externalEventId = calRes.eventId;
      }
    } catch (err: any) {
      console.error('Failed to create calendar event for finalized poll:', err.message);
    }

    // Mark poll as finalized
    await this.prisma.poll.update({
      where: { id: pollId },
      data: { status: 'FINALIZED' }
    });

    // Send confirmation emails to all participating voters
    for (const vote of eligibleVotes) {
      try {
        await this.emailService.sendBookingConfirmation(
          vote.guestEmail,
          vote.guestName,
          poll.title,
          winningSlot.startTime.toISOString(),
          meetLink || undefined,
          poll.duration,
          poll.host.profile?.name || poll.host.email
        );
      } catch (e: any) {
        console.error(`Failed to send confirmation email to ${vote.guestEmail}:`, e.message);
      }
    }

    return {
      success: true,
      pollId,
      status: 'FINALIZED',
      winningSlot: {
        id: winningSlot.id,
        startTime: winningSlot.startTime,
        endTime: winningSlot.endTime,
      },
      meetLink,
      attendeeCount: eligibleVotes.length,
      attendees: eligibleVotes.map(v => ({ name: v.guestName, email: v.guestEmail })),
    };
  }
}
