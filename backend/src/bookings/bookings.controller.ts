import { Controller, Post, Body, UseGuards, Request, Get, BadRequestException, Param, Query } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public endpoint for visitors
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.createBooking(createBookingDto);
  }

  @Get('public/confirmation')
  getConfirmation(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Confirmation token is required');
    return this.bookingsService.getConfirmationDetails(token);
  }

  // Protected endpoint for host dashboard
  @UseGuards(JwtAuthGuard)
  @Get('host')
  getHostBookings(@Request() req: any) {
    return this.bookingsService.getHostBookings(req.user.userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('guest/cancel')
  guestCancel(@Body('token') token: string) {
    if (!token) throw new BadRequestException('Token is required');
    return this.bookingsService.guestCancel(token);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('guest/reschedule')
  guestReschedule(@Body('token') token: string, @Body('newStartTime') newStartTime: string) {
    if (!token) throw new BadRequestException('Token is required');
    if (!newStartTime) throw new BadRequestException('newStartTime is required');
    return this.bookingsService.guestReschedule(token, newStartTime);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancelBooking(
    @Param('id') id: string, 
    @Request() req: any,
    @Body('reason') reason: string
  ) {
    return this.bookingsService.cancelBooking(id, req.user.userId, reason || 'Cancelled by host');
  }

  @Post('series/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelSeries(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason: string
  ) {
    return this.bookingsService.cancelSeries(id, req.user.userId, reason || 'Cancelled by host');
  }

  @UseGuards(JwtAuthGuard)
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
