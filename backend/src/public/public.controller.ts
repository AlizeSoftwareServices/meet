import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PublicService } from './public.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly bookingsService: BookingsService
  ) {}

  @Get('users/:username')
  async getUserProfile(@Param('username') username: string) {
    return this.publicService.getUserProfile(username);
  }

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

  @Post('bookings')
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }
}
