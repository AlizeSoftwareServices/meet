import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('event-types')
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createEventTypeDto: CreateEventTypeDto) {
    return this.eventTypesService.create(req.user.userId, createEventTypeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.eventTypesService.findAllForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.eventTypesService.findOne(id, req.user.userId);
  }

  // Public endpoint for visitor
  @Get('public/:hostId/:slug')
  findBySlug(@Param('hostId') hostId: string, @Param('slug') slug: string) {
    return this.eventTypesService.findBySlugAndHost(slug, hostId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateEventTypeDto: UpdateEventTypeDto) {
    return this.eventTypesService.update(id, req.user.userId, updateEventTypeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.eventTypesService.remove(id, req.user.userId);
  }
}
