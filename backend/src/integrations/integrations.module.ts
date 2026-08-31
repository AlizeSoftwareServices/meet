import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { CalendarService } from './calendar.service';
import { CronService } from './cron.service';
import { IntegrationsController } from './integrations.controller';
import { SlackService } from './slack.service';
import { PushNotificationService } from './push.service';

@Global()
@Module({
  controllers: [IntegrationsController],
  providers: [EmailService, CalendarService, CronService, SlackService, PushNotificationService],
  exports: [EmailService, CalendarService, SlackService, PushNotificationService],
})
export class IntegrationsModule {}
