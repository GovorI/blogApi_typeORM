import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  @Length(20, 300)
  content: string;
}
