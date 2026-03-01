import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(128)
  recipientId: string;

  @IsString()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsIn(['info', 'success', 'warning', 'error', 'rating', 'report', 'chat', 'listing'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  senderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  senderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  senderAvatar?: string;
}
