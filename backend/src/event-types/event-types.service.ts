import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import * as crypto from 'crypto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    const { enableReminder24h, customQuestions, schedulingType, teamId, hostIds, ...data } = dto;
    
    if (schedulingType && schedulingType !== 'PERSONAL') {
      if (!teamId) {
        throw new BadRequestException('Team ID is required for team events');
      }
      if (!hostIds || hostIds.length === 0) {
        throw new BadRequestException('At least one host must be selected for team events');
      }
      
      // Verify hosts belong to the team
      const validMembers = await this.prisma.teamMember.count({
        where: {
          teamId,
          userId: { in: hostIds }
        }
      });
      if (validMembers !== hostIds.length) {
        throw new BadRequestException('One or more selected hosts are not active members of this team');
      }
    }

    const eventType = await this.prisma.eventType.create({
      data: {
        ...data,
        userId,
        schedulingType: schedulingType || 'PERSONAL',
        teamId: (schedulingType && schedulingType !== 'PERSONAL' && teamId) ? teamId : undefined,
        customQuestions: {
          create: customQuestions?.map((q: any) => ({
            type: q.type,
            label: q.label,
            placeholder: q.placeholder,
            required: q.required,
            options: q.options || [],
            order: q.order,
          })) || []
        }
      },
    });

    // Create EventTypeHost records for team events
    if (schedulingType && schedulingType !== 'PERSONAL' && hostIds && hostIds.length > 0) {
      for (const uId of hostIds) {
        try {
          await this.prisma.eventTypeHost.create({
            data: { eventTypeId: eventType.id, userId: uId },
          });
        } catch {
          // Skip duplicates
        }
      }
    }

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
      include: {
        workflows: true,
        customQuestions: { orderBy: { order: 'asc' } },
        hosts: { include: { user: { include: { profile: true } } } },
        team: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: { id, userId },
      include: {
        workflows: true,
        customQuestions: { orderBy: { order: 'asc' } },
        hosts: { include: { user: { include: { profile: true } } } },
        team: true
      },
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
      include: {
        workflows: true,
        customQuestions: { orderBy: { order: 'asc' } },
        hosts: { include: { user: { include: { profile: true } } } },
        team: true
      },
    });

    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    return eventType;
  }

  async update(id: string, userId: string, dto: any) {
    // Verify ownership
    const currentEvent = await this.findOne(id, userId);
    const { enableReminder24h, customQuestions, schedulingType, teamId, hostIds, ...data } = dto;

    const updatePayload: any = { ...data };

    if (schedulingType !== undefined) {
      if (schedulingType === 'PERSONAL') {
        updatePayload.schedulingType = 'PERSONAL';
        updatePayload.teamId = null;
        await this.prisma.eventTypeHost.deleteMany({ where: { eventTypeId: id } });
      } else {
        const effectiveTeamId = teamId || currentEvent.teamId;
        if (!effectiveTeamId) {
          throw new BadRequestException('Team ID is required for team events');
        }

        updatePayload.schedulingType = schedulingType;
        updatePayload.teamId = effectiveTeamId;

        if (hostIds !== undefined) {
          if (!hostIds || hostIds.length === 0) {
            throw new BadRequestException('At least one host must be selected for team events');
          }

          // Verify hosts belong to the team
          const validMembers = await this.prisma.teamMember.count({
            where: {
              teamId: effectiveTeamId,
              userId: { in: hostIds }
            }
          });
          if (validMembers !== hostIds.length) {
            throw new BadRequestException('One or more selected hosts are not active members of this team');
          }

          await this.prisma.eventTypeHost.deleteMany({ where: { eventTypeId: id } });
          for (const uId of hostIds) {
            await this.prisma.eventTypeHost.create({
              data: { eventTypeId: id, userId: uId }
            }).catch(() => {});
          }
        }
      }
    } else if (teamId !== undefined || hostIds !== undefined) {
      const effectiveTeamId = teamId || currentEvent.teamId;
      if (currentEvent.schedulingType !== 'PERSONAL' && effectiveTeamId) {
        if (teamId !== undefined) {
          updatePayload.teamId = teamId;
        }
        if (hostIds !== undefined && hostIds.length > 0) {
          const validMembers = await this.prisma.teamMember.count({
            where: {
              teamId: effectiveTeamId,
              userId: { in: hostIds }
            }
          });
          if (validMembers !== hostIds.length) {
            throw new BadRequestException('One or more selected hosts are not active members of this team');
          }

          await this.prisma.eventTypeHost.deleteMany({ where: { eventTypeId: id } });
          for (const uId of hostIds) {
            await this.prisma.eventTypeHost.create({
              data: { eventTypeId: id, userId: uId }
            }).catch(() => {});
          }
        }
      }
    }

    const eventType = await this.prisma.eventType.update({
      where: { id },
      data: updatePayload,
      include: {
        workflows: true,
        customQuestions: { orderBy: { order: 'asc' } },
        hosts: { include: { user: { include: { profile: true } } } },
        team: true
      }
    });

    if (customQuestions !== undefined) {
      const incomingIds = customQuestions.map(q => q.id).filter(id => id);
      
      await this.prisma.customQuestion.deleteMany({
        where: {
          eventTypeId: id,
          id: { notIn: incomingIds }
        }
      });

      for (const q of customQuestions) {
        if (q.id) {
          const existing = await this.prisma.customQuestion.findFirst({ where: { id: q.id, eventTypeId: id } });
          if (existing) {
            await this.prisma.customQuestion.update({
              where: { id: q.id },
              data: {
                type: q.type,
                label: q.label,
                placeholder: q.placeholder,
                required: q.required,
                options: q.options || [],
                order: q.order,
              }
            });
          }
        } else {
          await this.prisma.customQuestion.create({
            data: {
              eventTypeId: id,
              type: q.type,
              label: q.label,
              placeholder: q.placeholder,
              required: q.required,
              options: q.options || [],
              order: q.order,
            }
          });
        }
      }
    }

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

    const futureBookings = await this.prisma.booking.count({
      where: {
        eventTypeId: id,
        status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        startTime: { gt: new Date() }
      }
    });

    if (futureBookings > 0) {
      // Soft archive
      return this.prisma.eventType.update({
        where: { id },
        data: { isActive: false }
      });
    } else {
      // Hard delete if safe
      return this.prisma.eventType.delete({
        where: { id },
      });
    }
  }

  async duplicate(id: string, userId: string) {
    const eventType = await this.findOne(id, userId);
    
    // Generate unique slug
    const slugSuffix = crypto.randomBytes(4).toString('hex');
    const newSlug = `${eventType.slug}-${slugSuffix}`;
    const newTitle = `${eventType.title} (Copy)`;

    return this.prisma.eventType.create({
      data: {
        userId,
        title: newTitle,
        description: eventType.description,
        duration: eventType.duration,
        location: eventType.location,
        slug: newSlug,
        color: eventType.color,
        isActive: true, // Default to active for new duplicated events
        maxDailyBookings: eventType.maxDailyBookings,
        minNotice: eventType.minNotice,
        maxAdvanceDays: eventType.maxAdvanceDays,
        bufferBefore: eventType.bufferBefore,
        bufferAfter: eventType.bufferAfter,
        isGroupEvent: eventType.isGroupEvent,
        maxInvitees: eventType.maxInvitees,
        allowRecurring: eventType.allowRecurring,
        recurringMaxOccurrences: eventType.recurringMaxOccurrences,
        confirmationMessage: eventType.confirmationMessage,
        redirectUrl: eventType.redirectUrl,
        availabilityId: eventType.availabilityId,
        customQuestions: {
          create: eventType.customQuestions.map(q => ({
            type: q.type,
            label: q.label,
            placeholder: q.placeholder,
            required: q.required,
            options: q.options || [],
            order: q.order,
          }))
        }
        // Workflows are not duplicated directly to avoid unwanted side effects,
        // though we could duplicate the 24h reminder workflow if we want.
      }
    });
  }

  async generateSingleUseLink(id: string, userId: string) {
    await this.findOne(id, userId); // verify ownership
    const token = crypto.randomBytes(32).toString('hex');
    
    // Default expiration to 7 days from now if not specified
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const link = await this.prisma.singleUseLink.create({
      data: {
        eventTypeId: id,
        tokenHash: token,
        expiresAt
      }
    });

    return {
      token: link.tokenHash,
      expiresAt: link.expiresAt
    };
  }
}
