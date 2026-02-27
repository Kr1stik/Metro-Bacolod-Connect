import { IsString, IsOptional, IsArray, IsIn, IsNumber, Min } from 'class-validator';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsString()
  location: string;

  @IsString()
  price: string;

  @IsOptional()
  @IsIn(['For Sale', 'For Rent', 'Sold', 'Reserved'])
  status?: string;

  @IsOptional()
  @IsIn(['Property', 'House & Lot', 'Condo', 'Lot Only', 'Commercial', 'Apartment'])
  type?: string;

  @IsOptional()
  @IsString()
  rooms?: string;

  @IsOptional()
  @IsString()
  bathrooms?: string;

  @IsOptional()
  @IsString()
  lotArea?: string;

  @IsOptional()
  @IsString()
  floorArea?: string;

  @IsOptional()
  @IsString()
  yearBuilt?: string;

  @IsOptional()
  @IsString()
  amenities?: string; // Comes as comma-separated string from FormData

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  userAvatar?: string;

  @IsOptional()
  @IsString()
  userCustomId?: string;

  @IsOptional()
  @IsString()
  userRole?: string;

  @IsOptional()
  @IsString()
  pinCoords?: string; // JSON string from FormData
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsIn(['For Sale', 'For Rent', 'Sold', 'Reserved'])
  status?: string;

  @IsOptional()
  @IsIn(['Property', 'House & Lot', 'Condo', 'Lot Only', 'Commercial', 'Apartment'])
  type?: string;

  @IsOptional()
  @IsString()
  rooms?: string;

  @IsOptional()
  @IsString()
  bathrooms?: string;

  @IsOptional()
  @IsString()
  lotArea?: string;

  @IsOptional()
  @IsString()
  floorArea?: string;

  @IsOptional()
  @IsString()
  yearBuilt?: string;

  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsString()
  pinCoords?: string;
}
