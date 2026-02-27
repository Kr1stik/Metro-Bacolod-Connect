import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateReportDto {
  @IsString()
  reportedId: string; // user or post ID being reported

  @IsIn(['user', 'post', 'listing'])
  reportType: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class UpdateReportStatusDto {
  @IsIn(['pending', 'reviewed', 'resolved', 'dismissed'])
  status: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
