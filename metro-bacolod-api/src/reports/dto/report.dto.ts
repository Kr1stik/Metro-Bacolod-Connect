import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @MaxLength(128)
  reportedId: string; // user or post ID being reported

  @IsIn(['user', 'post', 'listing'])
  reportType: string;

  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class UpdateReportStatusDto {
  @IsIn(['pending', 'reviewed', 'resolved', 'dismissed'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
