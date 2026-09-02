import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CronService } from './cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, CronService]
})
export class WorkflowsModule {}
