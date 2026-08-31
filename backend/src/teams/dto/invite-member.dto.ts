import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsIn(['ADMIN', 'MEMBER'])
  role: string;
}
