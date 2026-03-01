import { IsString, IsOptional, IsIn, IsBoolean, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  middleInitial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoURL?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  prcLicenseNo?: string;
}

export class ChangeRoleDto {
  @IsIn(['Client', 'Seller', 'Agent'])
  role: string;
}

export class DeactivateUserDto {
  @IsBoolean()
  isDeactivated: boolean;
}

export class RejectVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
