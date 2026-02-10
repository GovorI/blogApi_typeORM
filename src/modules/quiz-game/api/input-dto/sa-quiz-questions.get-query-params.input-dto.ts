import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';

export class GetSaQuizQuestionsQueryParams extends BaseQueryParams {
  bodySearchTerm?: string;
  publishedStatus?: PublishedStatus;
  sortBy?: SaQuizQuestionsSortBy;
}

export enum SaQuizQuestionsSortBy {
  Body = 'body',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
}

export enum PublishedStatus {
  All = 'all',
  Published = 'published',
  NotPublished = 'notPublished',
}
