import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomQuestionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['TEXT', 'LONG_TEXT', 'PHONE', 'NUMBER', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOX'])
  type: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateTeamEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['ROUND_ROBIN', 'COLLECTIVE'])
  schedulingType: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  hostIds: string[];

  @IsOptional()
  @IsNumber()
  maxDailyBookings?: number;

  @IsOptional()
  @IsNumber()
  minNotice?: number;

  @IsOptional()
  @IsNumber()
  maxAdvanceDays?: number;

  @IsOptional()
  @IsNumber()
  bufferBefore?: number;

  @IsOptional()
  @IsNumber()
  bufferAfter?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  customQuestions?: CustomQuestionDto[];
}
