import { IsString, IsEmail, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

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
  address?: string;

  @IsOptional()
  @IsIn(['Client', 'Seller', 'Agent'])
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoURL?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customId?: string;

  // uid is injected from the auth guard, not from client
  @IsOptional()
  @IsString()
  @MaxLength(128)
  uid?: string;
}
