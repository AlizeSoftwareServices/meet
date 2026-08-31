import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, ArrayNotEmpty, IsIn } from 'class-validator';

export const ALLOWED_WEBHOOK_EVENTS = [
  'booking.created',
  'booking.canceled',
  'booking.rescheduled',
  'booking.confirmed',
  'booking.completed',
  'webhook.test',
] as const;

export type WebhookEventType = typeof ALLOWED_WEBHOOK_EVENTS[number];

export class CreateWebhookDto {
  @IsUrl({ require_tld: false }, { message: 'URL must be a valid HTTP or HTTPS endpoint' })
  url: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one event must be selected' })
  @IsIn(ALLOWED_WEBHOOK_EVENTS, { each: true, message: 'Invalid webhook event type' })
  events: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
