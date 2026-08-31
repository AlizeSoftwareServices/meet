import { IsString, IsOptional, IsInt, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class PollSlotDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class CreatePollDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  duration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollSlotDto)
  slots: PollSlotDto[];
}
