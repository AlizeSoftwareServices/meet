import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  @IsIn(['ANDROID', 'IOS', 'WEB', 'android', 'ios', 'web'])
  platform?: string;
}
