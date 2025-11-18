import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LikeStatuses } from './like-status.dto';

export class CreateLikeStatusCommentDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  commentId: string;

  @IsNotEmpty()
  @IsEnum(LikeStatuses)
  status: LikeStatuses;
}
