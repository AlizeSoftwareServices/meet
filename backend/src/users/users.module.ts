import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PushController } from './push.controller';

@Module({
  controllers: [UsersController, PushController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
