import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum CommentSortBy {
  createdAt = 'createdAt',
  likesCount = 'likesCount',
  dislikesCount = 'dislikesCount',
}

export class GetCommentsQueryParams extends BaseQueryParams {
  @IsOptional()
  @IsEnum(CommentSortBy, {
    message: 'sortBy must be one of: createdAt, likesCount, dislikesCount',
  })
  sortBy: CommentSortBy = CommentSortBy.createdAt;
}
