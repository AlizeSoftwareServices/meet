import { Controller, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { DeletePushTokenDto } from './dto/delete-push-token.dto';

@Controller(['users/push-token', 'profile/push-token'])
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async registerToken(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    const userId = req.user.userId;
    const platform = dto.platform ? dto.platform.toUpperCase() : undefined;

    // We use upsert because the token is globally unique. 
    // If another user had it (e.g. signed out on the same device), it will be reassigned to the current user.
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: { userId, platform },
      create: { token: dto.token, userId, platform }
    });

    return { success: true, message: 'Push token registered' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async unregisterTokenByBody(@Request() req: any, @Body() dto: DeletePushTokenDto) {
    const userId = req.user.userId;

    const result = await this.prisma.pushToken.deleteMany({
      where: { token: dto.token, userId }
    });

    return { success: true, count: result.count };
  }

  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  async unregisterTokenByParam(@Request() req: any, @Param('token') token: string) {
    const userId = req.user.userId;

    const result = await this.prisma.pushToken.deleteMany({
      where: { token, userId }
    });

    return { success: true, count: result.count };
  }
}
