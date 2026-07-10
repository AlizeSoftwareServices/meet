import { IsString, IsEmail, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  hostId: string;

  @IsUUID()
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
}
