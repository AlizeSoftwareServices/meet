import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('schedules')
  getSchedules(@Request() req) {
    return this.availabilityService.getSchedules(req.user.userId);
  }

  @Post('schedules')
  createSchedule(@Request() req, @Body('name') name: string) {
    return this.availabilityService.createSchedule(req.user.userId, name || 'New Schedule');
  }

  @Get('schedules/:id')
  getSchedule(@Request() req, @Param('id') id: string) {
    return this.availabilityService.getSchedule(req.user.userId, id);
  }

  @Put('schedules/:id')
  updateSchedule(
    @Request() req,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('isDefault') isDefault: boolean,
    @Body('timezone') timezone: string,
    @Body('slots') slots: any[],
    @Body('overrides') overrides: any[] = []
  ) {
    return this.availabilityService.updateSchedule(req.user.userId, id, name, isDefault, timezone, slots, overrides);
  }

  @Delete('schedules/:id')
  deleteSchedule(@Request() req, @Param('id') id: string) {
    return this.availabilityService.deleteSchedule(req.user.userId, id);
  }

  // Legacy routes
  @Get()
  getAvailability(@Request() req) {
    return this.availabilityService.getAvailability(req.user.userId);
  }

  @Put()
  updateAvailability(
    @Request() req,
    @Body('slots') slots: any[],
    @Body('overrides') overrides: any[] = []
  ) {
    return this.availabilityService.setAvailability(req.user.userId, slots, overrides);
  }
}
