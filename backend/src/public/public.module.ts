import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { BookingsModule } from '../bookings/bookings.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [BookingsModule, IntegrationsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
