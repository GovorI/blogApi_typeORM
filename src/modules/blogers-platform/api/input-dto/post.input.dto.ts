import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostInputDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 30)
  title: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  shortDescription: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content: string;

  @IsNotEmpty()
  @IsString()
  blogId: string;
}

/**
 * Data transfer object for creating a post within a specific blog
 * The blogId is provided via URL parameter, not request body
 */
export class CreatePostForBlogInputDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 30)
  title: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  shortDescription: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content: string;
}

/**
 * Data transfer object for updating an existing post
 */
export class UpdatePostInputDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 30)
  title?: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  shortDescription?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content?: string;
}
