import { IsString, IsEmail, IsIn } from 'class-validator';

export class VotePollDto {
  @IsString()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsString()
  pollSlotId: string;

  @IsString()
  @IsIn(['YES', 'NO', 'IF_NEED_BE'])
  status: string;
}
