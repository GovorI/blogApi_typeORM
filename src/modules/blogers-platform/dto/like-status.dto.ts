import { IsEnum, IsNotEmpty } from 'class-validator';

export enum LikeStatuses {
  Like = 'Like',
  Dislike = 'Dislike',
  None = 'None',
}

export class LikeStatusDto {
  @IsEnum(LikeStatuses, {
    message:
      'likeStatus must be one of the following values: Like, Dislike, None',
  })
  @IsNotEmpty()
  likeStatus: LikeStatuses;
}
