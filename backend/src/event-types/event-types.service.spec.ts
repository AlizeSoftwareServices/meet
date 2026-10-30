import { Test, TestingModule } from '@nestjs/testing';
import { EventTypesService } from './event-types.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventTypesService', () => {
  let service: EventTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTypesService,
        {
          provide: PrismaService,
          useValue: {
            eventType: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            teamMember: {
              count: jest.fn(),
            },
            eventTypeHost: {
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
            workflow: {
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
            customQuestion: {
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
              findFirst: jest.fn(),
            },
            booking: {
              count: jest.fn(),
            },
            singleUseLink: {
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventTypesService>(EventTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
