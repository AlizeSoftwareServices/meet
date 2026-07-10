import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [ContactsModule, PrismaModule, IntegrationsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService]
})
export class BookingsModule {}
