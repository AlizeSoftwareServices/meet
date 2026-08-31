import { IsString, IsInt, IsIn, IsNotEmpty } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  eventTypeId: string;

  @IsString()
  @IsIn(['BEFORE_EVENT', 'AFTER_EVENT'])
  triggerType: string;

  @IsInt()
  timeOffset: number; // in minutes

  @IsString()
  @IsIn(['EMAIL']) // Could expand later to 'SMS', 'WEBHOOK'
  actionType: string;
}
