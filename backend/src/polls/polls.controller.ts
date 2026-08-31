import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createPoll(@Request() req, @Body() createPollDto: CreatePollDto) {
    return this.pollsService.createPoll(req.user.userId, createPollDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getHostPolls(@Request() req) {
    return this.pollsService.getHostPolls(req.user.userId);
  }

  @Get(':id')
  getPollById(@Param('id') id: string) {
    return this.pollsService.getPollById(id);
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() voteDto: VotePollDto) {
    return this.pollsService.vote(id, voteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/close')
  closePoll(@Request() req, @Param('id') id: string) {
    return this.pollsService.closePoll(req.user.userId, id);
  }
}
