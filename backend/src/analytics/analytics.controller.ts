import { Controller, Get, UseGuards, Request, Query, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.analyticsService.getDashboardAnalytics(req.user.userId, startDate, endDate);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="bookings-export.csv"')
  async exportBookings(
    @Request() req,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const csvData = await this.analyticsService.exportBookingsCsv(req.user.userId, startDate, endDate);
    res.send(csvData);
  }

  @Get('event-types')
  getEventTypeAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.analyticsService.getEventTypeAnalytics(req.user.userId, startDate, endDate);
  }
}
