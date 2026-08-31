import { IsString, IsInt, IsOptional, IsBoolean, Min, IsArray, ValidateNested, IsIn, IsUrl, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsIn(['TEXT', 'LONG_TEXT', 'PHONE', 'NUMBER', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'])
  type: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsInt()
  order: number;
}

export class CreateEventTypeDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  duration: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  availabilityId?: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isGroupEvent?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxInvitees?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  customQuestions?: CustomQuestionDto[];

  @IsBoolean()
  @IsOptional()
  allowRecurring?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  recurringMaxOccurrences?: number;

  @IsString()
  @IsOptional()
  confirmationMessage?: string;

  @IsOptional()
  @ValidateIf(o => o.redirectUrl !== '')
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Must be a valid HTTP/HTTPS URL' })
  redirectUrl?: string;
}
