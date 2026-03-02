import { IsString, IsUrl, MaxLength } from 'class-validator';

export class OcrExtractDto {
  @IsString()
  @IsUrl()
  @MaxLength(2000)
  imageUrl: string;
}
