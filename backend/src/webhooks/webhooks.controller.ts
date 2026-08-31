import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.webhooksService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.delete(req.user.userId, id);
  }

  @Get(':id/deliveries')
  getDeliveries(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.getDeliveries(req.user.userId, id);
  }

  @Post(':id/test')
  testWebhook(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.testWebhook(req.user.userId, id);
  }
}
