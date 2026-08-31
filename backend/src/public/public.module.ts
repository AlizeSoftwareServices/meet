import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { BookingsModule } from '../bookings/bookings.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [BookingsModule, IntegrationsModule, AvailabilityModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
