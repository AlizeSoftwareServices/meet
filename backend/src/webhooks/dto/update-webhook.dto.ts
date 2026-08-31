import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, ArrayNotEmpty, IsIn } from 'class-validator';
import { ALLOWED_WEBHOOK_EVENTS } from './create-webhook.dto';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'URL must be a valid HTTP or HTTPS endpoint' })
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one event must be selected' })
  @IsIn(ALLOWED_WEBHOOK_EVENTS, { each: true, message: 'Invalid webhook event type' })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
