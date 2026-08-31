import { IsNotEmpty, IsString } from 'class-validator';

export class DeletePushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
