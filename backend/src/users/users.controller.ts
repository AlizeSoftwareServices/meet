import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put()
  updateProfile(@Request() req, @Body() updateProfileDto: any) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }
}
