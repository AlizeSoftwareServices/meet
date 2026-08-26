import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

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
}
