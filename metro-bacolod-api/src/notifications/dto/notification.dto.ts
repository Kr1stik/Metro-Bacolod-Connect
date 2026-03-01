import { IsString, IsOptional, IsIn, MaxLength, Matches } from 'class-validator';

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

  // OWASP A03: Validate linkTo is a safe relative path or HTTPS URL
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/[\w\-\/]*|https:\/\/[\w\-\.]+\.[a-z]{2,}[\/\w\-\.\/]*)$/i, {
    message: 'linkTo must be a relative path starting with / or an HTTPS URL',
  })
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
