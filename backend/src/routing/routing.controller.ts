import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoutingService } from './routing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('routing')
  createForm(@Request() req: any, @Body() data: any) {
    return this.routingService.createForm(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('routing')
  getForms(@Request() req: any) {
    return this.routingService.getForms(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('routing/:id')
  getFormById(@Request() req: any, @Param('id') id: string) {
    return this.routingService.getFormById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('routing/:id')
  updateForm(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.routingService.updateForm(id, req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('routing/:id/duplicate')
  duplicateForm(@Request() req: any, @Param('id') id: string) {
    return this.routingService.duplicateForm(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('routing/:id/toggle')
  toggleActive(@Request() req: any, @Param('id') id: string) {
    return this.routingService.toggleActive(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('routing/:id')
  deleteForm(@Request() req: any, @Param('id') id: string) {
    return this.routingService.deleteForm(id, req.user.userId);
  }

  // Public get form metadata endpoint
  @Get('public/routing/:identifier/:slug')
  getPublicForm(
    @Param('identifier') identifier: string,
    @Param('slug') slug: string,
  ) {
    return this.routingService.getPublicForm(identifier, slug);
  }

  // Public submission endpoint
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('public/routing/:identifier/:slug/submit')
  submitRoutingForm(
    @Param('identifier') identifier: string,
    @Param('slug') slug: string,
    @Body('answers') answers: { questionId: string; value: string }[],
  ) {
    return this.routingService.submitRoutingForm(identifier, slug, answers || []);
  }
}
