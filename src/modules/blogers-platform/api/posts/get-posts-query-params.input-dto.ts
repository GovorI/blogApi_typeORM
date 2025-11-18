import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';

export class GetPostsQueryParams extends BaseQueryParams {
  sortBy?: PostsSortBy;
}

export enum PostsSortBy {
  Title = 'title',
  ShortDescription = 'shortDescription',
  Content = 'content',
  CreatedAt = 'createdAt',
  BlogName = 'blogName',
}
