import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityEngineService } from './availability.engine';
import { AvailabilityController } from './availability.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  providers: [AvailabilityService, AvailabilityEngineService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService, AvailabilityEngineService]
})
export class AvailabilityModule {}
