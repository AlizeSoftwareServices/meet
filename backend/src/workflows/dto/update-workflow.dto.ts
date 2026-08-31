import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowDto } from './create-workflow.dto';
import { OmitType } from '@nestjs/mapped-types';

// We shouldn't allow changing eventTypeId after creation usually
export class UpdateWorkflowDto extends PartialType(OmitType(CreateWorkflowDto, ['eventTypeId'] as const)) {}
