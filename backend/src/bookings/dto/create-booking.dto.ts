import { IsString, IsEmail, IsOptional, IsDateString, IsArray, ValidateNested, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  value: string;
}

export class RecurrenceDto {
  @IsString()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: string;

  @IsInt()
  @Min(1)
  interval: number;

  @IsInt()
  @Min(2)
  count: number;
}

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  hostId?: string;

  @IsString()
  eventTypeId: string;

  @IsString()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  @IsString()
  @IsOptional()
  guestCompany?: string;

  @IsString()
  @IsOptional()
  guestNotes?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers?: AnswerDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;

  @IsOptional()
  @IsString()
  singleUseToken?: string;
}
