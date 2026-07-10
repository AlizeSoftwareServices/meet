import { Test, TestingModule } from '@nestjs/testing';
import { EventTypesController } from './event-types.controller';

describe('EventTypesController', () => {
  let controller: EventTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventTypesController],
    }).compile();

    controller = module.get<EventTypesController>(EventTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
