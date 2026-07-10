import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { CalendarService } from './calendar.service';
import { CronService } from './cron.service';
import { IntegrationsController } from './integrations.controller';
import { SlackService } from './slack.service';

@Global()
@Module({
  controllers: [IntegrationsController],
  providers: [EmailService, CalendarService, CronService, SlackService],
  exports: [EmailService, CalendarService, SlackService],
})
export class IntegrationsModule {}
