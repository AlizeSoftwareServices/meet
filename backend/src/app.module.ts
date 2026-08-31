import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventTypesModule } from './event-types/event-types.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContactsModule } from './contacts/contacts.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PublicModule } from './public/public.module';
import { MailModule } from './mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { WorkflowsModule } from './workflows/workflows.module';

import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { PollsModule } from './polls/polls.module';
import { RoutingModule } from './routing/routing.module';
import { TeamsModule } from './teams/teams.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{
        ttl: 60000,
        limit: 60,
      }],
      storage: process.env.REDIS_URL ? new ThrottlerStorageRedisService(process.env.REDIS_URL) : undefined,
    }),
    PrismaModule, 
    UsersModule, 
    AuthModule, 
    EventTypesModule, 
    AvailabilityModule, 
    BookingsModule, 
    IntegrationsModule, 
    AnalyticsModule,
    ContactsModule,
    PublicModule,
    MailModule,
    WorkflowsModule,
    PollsModule,
    RoutingModule,
    TeamsModule,
    WebhooksModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
