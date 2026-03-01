import { IsString, IsOptional, IsArray, ArrayMinSize, MaxLength, ArrayMaxSize } from 'class-validator';

export class CreateChatDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  participants: string[];
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;
}
