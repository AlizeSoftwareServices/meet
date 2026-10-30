import { Test, TestingModule } from '@nestjs/testing';
import { EventTypesController } from './event-types.controller';
import { EventTypesService } from './event-types.service';

describe('EventTypesController', () => {
  let controller: EventTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventTypesController],
      providers: [
        {
          provide: EventTypesService,
          useValue: {
            create: jest.fn(),
            findAllForUser: jest.fn(),
            findOne: jest.fn(),
            findBySlugAndHost: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            duplicate: jest.fn(),
            generateSingleUseLink: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventTypesController>(EventTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
