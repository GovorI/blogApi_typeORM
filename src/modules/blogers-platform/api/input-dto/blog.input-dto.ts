import { CreateBlogDto } from '../../dto/create-blog.dto';
import { UpdateBlogDto } from '../../dto/update-blog.dto';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data transfer object for creating a new blog
 */
export class CreateBlogInputDto implements CreateBlogDto {
  /** Blog name (max 15 characters) */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 15)
  name: string;

  /** Blog description (max 500 characters) */
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  /** Blog website URL (max 100 characters) */
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(100)
  websiteUrl: string;
}

/**
 * Data transfer object for updating an existing blog
 */
export class UpdateBlogInputDto implements UpdateBlogDto {
  /** Blog name (max 15 characters) */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 15)
  name: string;

  /** Blog description (max 500 characters) */
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  /** Blog website URL (max 100 characters) */
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(100)
  websiteUrl: string;
}
