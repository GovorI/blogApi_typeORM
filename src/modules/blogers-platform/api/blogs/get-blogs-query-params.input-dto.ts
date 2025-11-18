import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';

export class GetBlogsQueryParams extends BaseQueryParams {
  searchNameTerm?: string;
  sortBy?: BlogsSortBy;
}

export enum BlogsSortBy {
  Name = 'name',
  Description = 'description',
  CreatedAt = 'createdAt',
}
