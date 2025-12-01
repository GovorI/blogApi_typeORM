import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommentInputDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  content: string;
}
