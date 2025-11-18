import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBlogDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNotEmpty()
  @IsUrl()
  @MaxLength(100)
  websiteUrl: string;
}
