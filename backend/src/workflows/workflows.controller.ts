import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  create(@Request() req, @Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.create(req.user.userId, createWorkflowDto);
  }

  @Get('event-type/:eventTypeId')
  findAllByEventType(@Request() req, @Param('eventTypeId') eventTypeId: string) {
    return this.workflowsService.findAllByEventType(req.user.userId, eventTypeId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.workflowsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.workflowsService.update(req.user.userId, id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.workflowsService.remove(req.user.userId, id);
  }
}
