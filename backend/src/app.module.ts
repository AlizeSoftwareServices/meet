import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, 
    UsersModule, 
    AuthModule, 
    EventTypesModule, 
    AvailabilityModule, 
    BookingsModule, 
    IntegrationsModule, 
    AnalyticsModule,
    ContactsModule,
    PublicModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
