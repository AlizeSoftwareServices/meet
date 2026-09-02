import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly bookingsService: BookingsService
  ) {}

  // FIX #4: Profile lookups — generous limit, mostly read-only
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('users/:username')
  async getUserProfile(@Param('username') username: string) {
    return this.publicService.getUserProfile(username);
  }

  // FIX #4: Availability slot queries — 60/min per IP is fair for calendar browsing
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('availability/:username/:eventSlug/slots')
  async getAvailableSlots(
    @Param('username') username: string,
    @Param('eventSlug') eventSlug: string,
    @Query('date') date: string,
    @Query('timezone') timezone: string
  ) {
    if (!date) {
      throw new BadRequestException('Date query parameter is required (YYYY-MM-DD)');
    }
    return this.publicService.getAvailableSlots(username, eventSlug, date, timezone);
  }

  // FIX #4: Booking creation — strict 10/min to prevent spam/abuse
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('bookings')
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }
}
