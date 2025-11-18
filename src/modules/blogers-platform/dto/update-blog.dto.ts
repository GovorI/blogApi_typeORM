import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(100)
  websiteUrl?: string;
}
