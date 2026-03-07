import { IsString, IsOptional, IsArray, IsIn, IsNumber, Min, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsString()
  @MaxLength(500)
  location: string;

  @IsString()
  @MaxLength(50)
  price: string;

  @IsOptional()
  @IsIn(['For Sale', 'For Rent', 'Sold', 'Reserved'])
  status?: string;

  @IsOptional()
  @IsIn(['Property', 'House & Lot', 'Condo', 'Lot Only', 'Commercial', 'Apartment'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rooms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bathrooms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lotArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floorArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  yearBuilt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  amenities?: string; // Comes as comma-separated string from FormData

  @IsOptional()
  @IsString()
  @MaxLength(200)
  userName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAvatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  userCustomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  userRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  userPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pinCoords?: string; // JSON string from FormData
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  price?: string;

  @IsOptional()
  @IsIn(['For Sale', 'For Rent', 'Sold', 'Reserved'])
  status?: string;

  @IsOptional()
  @IsIn(['Property', 'House & Lot', 'Condo', 'Lot Only', 'Commercial', 'Apartment'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rooms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bathrooms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lotArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floorArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  yearBuilt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  amenities?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pinCoords?: string;
}
