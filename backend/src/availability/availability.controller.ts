import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

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
