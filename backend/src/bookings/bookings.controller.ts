import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public endpoint for visitors
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.createBooking(createBookingDto);
  }

  // Protected endpoint for host dashboard
  @UseGuards(JwtAuthGuard)
  @Get('host')
  getHostBookings(@Request() req) {
    return this.bookingsService.getHostBookings(req.user.userId);
  }

  @Post(':id/cancel')
  cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req
  ) {
    return this.bookingsService.cancelBooking(id, req.user.userId, reason);
  }

  @Post(':id/reschedule')
  rescheduleBooking(
    @Param('id') id: string,
    @Body('newStartTime') newStartTime: string,
    @Body('newEndTime') newEndTime: string,
    @Request() req
  ) {
    return this.bookingsService.rescheduleBooking(id, req.user.userId, new Date(newStartTime), new Date(newEndTime));
  }
}
