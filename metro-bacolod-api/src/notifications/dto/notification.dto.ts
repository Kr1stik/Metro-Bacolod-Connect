import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  recipientId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsIn(['info', 'success', 'warning', 'error', 'rating', 'report', 'chat', 'listing'])
  type?: string;

  @IsOptional()
  @IsString()
  linkTo?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderAvatar?: string;
}
