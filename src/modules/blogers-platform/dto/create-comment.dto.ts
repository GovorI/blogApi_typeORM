import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  postId: string;

  @IsNotEmpty()
  @IsString()
  @Length(20, 300)
  content: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  userLogin: string;
}
