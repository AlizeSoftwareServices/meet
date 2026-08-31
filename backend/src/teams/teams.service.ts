import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateTeamEventDto } from './dto/create-team-event.dto';
import * as crypto from 'crypto';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async create(userId: string, createTeamDto: CreateTeamDto) {
    // Ensure slug is unique
    const existing = await this.prisma.team.findUnique({ where: { slug: createTeamDto.slug } });
    if (existing) {
      throw new ConflictException('Team slug already taken');
    }

    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        slug: createTeamDto.slug,
        description: createTeamDto.description,
        ownerId: userId,
        members: {
          create: [{ userId, role: 'OWNER' }]
        }
      }
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: { members: true, eventTypes: true }
        },
        members: { include: { user: { include: { profile: true } } } }
      }
    });
  }

  async findOne(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        members: { some: { userId } }
      },
      include: {
        members: { include: { user: { include: { profile: true } } } },
        eventTypes: { include: { hosts: { include: { user: { include: { profile: true } } } } } },
        invitations: { where: { acceptedAt: null } }
      }
    });
    if (!team) throw new NotFoundException('Team not found or access denied');
    return team;
  }

  async update(teamId: string, userId: string, updateTeamDto: UpdateTeamDto) {
    await this.requireRole(teamId, userId, ['OWNER', 'ADMIN']);

    if (updateTeamDto.slug) {
      const existing = await this.prisma.team.findFirst({ where: { slug: updateTeamDto.slug, id: { not: teamId } } });
      if (existing) throw new ConflictException('Team slug already taken');
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: updateTeamDto
    });
  }

  async remove(teamId: string, userId: string) {
    await this.requireRole(teamId, userId, ['OWNER']);
    return this.prisma.team.delete({ where: { id: teamId } });
  }

  // --- Members & Invitations ---

  private async requireRole(teamId: string, userId: string, roles: string[]) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return member;
  }

  async getMembers(teamId: string, userId: string) {
    const team = await this.findOne(teamId, userId); // verify membership
    return team.members;
  }

  async inviteMember(teamId: string, inviterUserId: string, inviteDto: InviteMemberDto) {
    await this.requireRole(teamId, inviterUserId, ['OWNER', 'ADMIN']);

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const existingUser = await this.prisma.user.findUnique({ where: { email: inviteDto.email } });
    if (existingUser) {
      const existingMember = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } }
      });
      if (existingMember) throw new ConflictException('User is already a member of this team');
    }

    const existingInvite = await this.prisma.teamInvitation.findFirst({
      where: { teamId, email: inviteDto.email, acceptedAt: null }
    });
    if (existingInvite) throw new ConflictException('Active invitation already exists for this email');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.teamInvitation.create({
      data: {
        teamId,
        email: inviteDto.email,
        role: inviteDto.role,
        tokenHash,
        expiresAt
      }
    });

    this.emailService.sendTeamInvitationEmail(
      inviteDto.email,
      team.name,
      rawToken
    ).catch(e => {
      console.warn(`Failed to send team invitation email: ${e.message}`);
    });

    return { message: 'Invitation sent' };
  }

  async acceptInvitation(userId: string, acceptDto: AcceptInvitationDto) {
    const tokenHash = crypto.createHash('sha256').update(acceptDto.token).digest('hex');

    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { tokenHash }
    });

    if (!invitation) throw new NotFoundException('Invalid invitation token');
    if (invitation.acceptedAt) throw new ConflictException('Invitation already accepted');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.email !== invitation.email) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-check acceptedAt inside transaction to prevent replay
      const currentInvite = await tx.teamInvitation.findUnique({ where: { id: invitation.id } });
      if (currentInvite?.acceptedAt) throw new ConflictException('Invitation already accepted');

      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      });

      return tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: user.id,
          role: invitation.role
        }
      });
    });
  }

  async removeMember(teamId: string, requesterUserId: string, targetUserId: string) {
    const targetMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } }
    });
    if (!targetMember) throw new NotFoundException('Member not found');

    if (requesterUserId === targetUserId && targetMember.role === 'OWNER') {
      const otherOwners = await this.prisma.teamMember.count({
        where: { teamId, role: 'OWNER', userId: { not: targetUserId } }
      });
      if (otherOwners === 0) throw new BadRequestException('Cannot leave team as the only owner');
    } else if (requesterUserId !== targetUserId) {
      // Trying to remove someone else
      await this.requireRole(teamId, requesterUserId, ['OWNER', 'ADMIN']);
      if (targetMember.role === 'OWNER') {
        throw new ForbiddenException('Cannot remove an owner');
      }
    }

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } }
    });
  }

  async updateRole(teamId: string, requesterUserId: string, targetUserId: string, updateRoleDto: UpdateRoleDto) {
    const requester = await this.requireRole(teamId, requesterUserId, ['OWNER', 'ADMIN']);
    const targetMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } }
    });
    if (!targetMember) throw new NotFoundException('Member not found');

    if (requester.role === 'ADMIN' && (updateRoleDto.role === 'OWNER' || targetMember.role === 'OWNER')) {
      throw new ForbiddenException('Admins cannot grant or modify owner roles');
    }

    if (targetMember.role === 'OWNER' && updateRoleDto.role !== 'OWNER') {
      const otherOwners = await this.prisma.teamMember.count({
        where: { teamId, role: 'OWNER', userId: { not: targetUserId } }
      });
      if (otherOwners === 0) throw new BadRequestException('Team must have at least one owner');
    }

    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role: updateRoleDto.role }
    });
  }

  // --- Team Event Types ---
  async createTeamEvent(teamId: string, userId: string, createDto: CreateTeamEventDto) {
    await this.requireRole(teamId, userId, ['OWNER', 'ADMIN']);

    if (createDto.schedulingType !== 'ROUND_ROBIN' && createDto.schedulingType !== 'COLLECTIVE') {
      throw new BadRequestException('Team event schedulingType must be ROUND_ROBIN or COLLECTIVE');
    }

    if (!createDto.hostIds || createDto.hostIds.length === 0) {
      throw new BadRequestException('Team events require at least one host');
    }

    if (createDto.schedulingType === 'COLLECTIVE' && createDto.hostIds.length < 1) {
      throw new BadRequestException('COLLECTIVE events require hosts');
    }

    // Verify all assigned hosts are team members
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId, userId: { in: createDto.hostIds } }
    });
    if (teamMembers.length !== createDto.hostIds.length) {
      throw new BadRequestException('One or more selected hosts are not active members of this team');
    }

    const { customQuestions, hostIds, ...eventData } = createDto;

    return this.prisma.eventType.create({
      data: {
        ...eventData,
        userId, // Creator's ID
        teamId,
        customQuestions: customQuestions ? { create: customQuestions } : undefined,
        hosts: {
          create: hostIds.map(hId => ({ userId: hId }))
        }
      }
    });
  }
}
