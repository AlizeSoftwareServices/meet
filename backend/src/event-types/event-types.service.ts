import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import * as crypto from 'crypto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventTypeDto) {
    const { enableReminder24h, customQuestions, schedulingType, teamId, hostIds, availabilityId, redirectUrl, ...data } = dto;

    const cleanTeamId = (teamId && typeof teamId === 'string' && teamId.trim() !== '') ? teamId.trim() : undefined;
    const cleanAvailabilityId = (availabilityId && typeof availabilityId === 'string' && availabilityId.trim() !== '') ? availabilityId.trim() : undefined;
    const cleanRedirectUrl = (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.trim() !== '') ? redirectUrl.trim() : undefined;
    
    if (schedulingType && schedulingType !== 'PERSONAL') {
      if (!cleanTeamId) {
        throw new BadRequestException('Team ID is required for team events');
      }
      if (!hostIds || hostIds.length === 0) {
        throw new BadRequestException('At least one host must be selected for team events');
      }
      
      // Verify hosts belong to the team
      const validMembers = await this.prisma.teamMember.count({
        where: {
          teamId: cleanTeamId,
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
        teamId: (schedulingType && schedulingType !== 'PERSONAL') ? cleanTeamId : undefined,
        availabilityId: cleanAvailabilityId,
        redirectUrl: cleanRedirectUrl,
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

  async update(id: string, userId: string, dto: UpdateEventTypeDto) {
    // Verify ownership
    const currentEvent = await this.findOne(id, userId);
    const { enableReminder24h, customQuestions, schedulingType, teamId, hostIds, availabilityId, redirectUrl, ...data } = dto;

    const updatePayload: any = { ...data };

    if (availabilityId !== undefined) {
      updatePayload.availabilityId = (availabilityId && typeof availabilityId === 'string' && availabilityId.trim() !== '') ? availabilityId.trim() : null;
    }
    if (redirectUrl !== undefined) {
      updatePayload.redirectUrl = (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.trim() !== '') ? redirectUrl.trim() : null;
    }

    if (schedulingType !== undefined) {
      if (schedulingType === 'PERSONAL') {
        updatePayload.schedulingType = 'PERSONAL';
        updatePayload.teamId = null;
        await this.prisma.eventTypeHost.deleteMany({ where: { eventTypeId: id } });
      } else {
        const effectiveTeamId = (teamId && typeof teamId === 'string' && teamId.trim() !== '') ? teamId.trim() : currentEvent.teamId;
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
      const effectiveTeamId = (teamId && typeof teamId === 'string' && teamId.trim() !== '') ? teamId.trim() : currentEvent.teamId;
      if (currentEvent.schedulingType !== 'PERSONAL' && effectiveTeamId) {
        if (teamId !== undefined) {
          updatePayload.teamId = effectiveTeamId;
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

    await this.prisma.eventType.update({
      where: { id },
      data: updatePayload,
    });

    if (customQuestions !== undefined) {
      const incomingIds: string[] = customQuestions
        .map(q => q.id)
        .filter((id): id is string => Boolean(id));
      
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

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    const totalBookings = await this.prisma.booking.count({
      where: { eventTypeId: id }
    });

    if (totalBookings > 0) {
      // Soft archive to protect past booking records and FK integrity
      return this.prisma.eventType.update({
        where: { id },
        data: { isActive: false }
      });
    } else {
      // Safe hard delete: cascade remove associated relations
      await this.prisma.workflow.deleteMany({ where: { eventTypeId: id } }).catch(() => {});
      await this.prisma.singleUseLink.deleteMany({ where: { eventTypeId: id } }).catch(() => {});
      await this.prisma.eventTypeHost.deleteMany({ where: { eventTypeId: id } }).catch(() => {});
      await this.prisma.customQuestion.deleteMany({ where: { eventTypeId: id } }).catch(() => {});

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

    const newEvent = await this.prisma.eventType.create({
      data: {
        userId,
        title: newTitle,
        description: eventType.description,
        duration: eventType.duration,
        location: eventType.location,
        slug: newSlug,
        color: eventType.color,
        isActive: true, // Default to active for new duplicated events
        schedulingType: eventType.schedulingType,
        teamId: eventType.teamId,
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
        price: (eventType as any).price ?? null,
        currency: (eventType as any).currency ?? 'usd',
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
      } as any
    });

    if (eventType.schedulingType !== 'PERSONAL' && eventType.hosts && eventType.hosts.length > 0) {
      for (const h of eventType.hosts) {
        await this.prisma.eventTypeHost.create({
          data: { eventTypeId: newEvent.id, userId: h.userId }
        }).catch(() => {});
      }
    }

    return newEvent;
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
