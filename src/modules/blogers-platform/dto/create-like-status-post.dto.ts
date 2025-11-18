import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LikeStatuses } from './like-status.dto';

export class CreateLikeStatusPostDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  login: string;

  @IsNotEmpty()
  @IsString()
  postId: string;

  @IsNotEmpty()
  @IsEnum(LikeStatuses)
  status: LikeStatuses;
}
