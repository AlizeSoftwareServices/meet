import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email.service';
import { CalendarService } from '../integrations/calendar.service';
import { SlackService } from '../integrations/slack.service';
import { ContactsService } from '../contacts/contacts.service';
import { AvailabilityEngineService } from '../availability/availability.engine';
import { SecureTokenService } from '../auth/secure-token.service';
import { PushNotificationService } from '../integrations/push.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: CalendarService, useValue: {} },
        { provide: SlackService, useValue: {} },
        { provide: ContactsService, useValue: {} },
        { provide: AvailabilityEngineService, useValue: {} },
        { provide: SecureTokenService, useValue: {} },
        { provide: PushNotificationService, useValue: {} },
        { provide: WebhookDeliveryService, useValue: {} },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
