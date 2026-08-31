import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException, HttpCode } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateTeamEventDto } from './dto/create-team-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  }
}

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(req.user.id, createTeamDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.teamsService.findAllForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.teamsService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, req.user.id, updateTeamDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.teamsService.remove(id, req.user.id);
  }

  // --- Members & Invitations ---

  @UseGuards(JwtAuthGuard)
  @Get(':id/members')
  getMembers(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.teamsService.getMembers(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invitations')
  inviteMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() inviteDto: InviteMemberDto) {
    return this.teamsService.inviteMember(id, req.user.id, inviteDto);
  }

  // Accept invitation does not necessarily require JWT if handled publicly first, but let's assume it requires login for simplicity, or we check both. The prompt says "require authentication before acceptance if necessary".
  @UseGuards(JwtAuthGuard)
  @Post('invitations/accept')
  @HttpCode(200)
  acceptInvitation(@Req() req: AuthenticatedRequest, @Body() acceptDto: AcceptInvitationDto) {
    return this.teamsService.acceptInvitation(req.user.id, acceptDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  removeMember(@Req() req: AuthenticatedRequest, @Param('id') teamId: string, @Param('userId') memberUserId: string) {
    return this.teamsService.removeMember(teamId, req.user.id, memberUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/members/:userId/role')
  updateRole(@Req() req: AuthenticatedRequest, @Param('id') teamId: string, @Param('userId') memberUserId: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.teamsService.updateRole(teamId, req.user.id, memberUserId, updateRoleDto);
  }

  // --- Team Event Types ---

  @UseGuards(JwtAuthGuard)
  @Post(':id/event-types')
  createTeamEvent(@Req() req: AuthenticatedRequest, @Param('id') teamId: string, @Body() createDto: CreateTeamEventDto) {
    return this.teamsService.createTeamEvent(teamId, req.user.id, createDto);
  }
}
