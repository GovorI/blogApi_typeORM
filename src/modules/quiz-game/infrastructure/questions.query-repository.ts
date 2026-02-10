import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import {
  GetSaQuizQuestionsQueryParams,
  PublishedStatus,
  SaQuizQuestionsSortBy,
} from '../api/input-dto/sa-quiz-questions.get-query-params.input-dto';
import { QuizQuestionViewDto } from '../api/view-dto/quiz-question.view-dto';
import { QuestionEntity } from '../domain/question.entity';

@Injectable()
export class QuestionsQueryRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getByIdOrNotFoundFail(id: string): Promise<QuizQuestionViewDto> {
    const question = await this.dataSource
      .getRepository(QuestionEntity)
      .createQueryBuilder('q')
      .where('q.id = :id', { id })
      .andWhere('q.deletedAt IS NULL')
      .getOne();

    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found',
      });
    }

    return QuizQuestionViewDto.mapToView(question);
  }

  async getAll(
    query: GetSaQuizQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuizQuestionViewDto[]>> {
    const questionsRepository = this.dataSource.getRepository(QuestionEntity);

    const baseQuery = questionsRepository
      .createQueryBuilder('q')
      .where('q.deletedAt IS NULL');

    const publishedStatus = query.publishedStatus ?? PublishedStatus.All;
    if (publishedStatus === PublishedStatus.Published) {
      baseQuery.andWhere('q.published = :published', { published: true });
    }
    if (publishedStatus === PublishedStatus.NotPublished) {
      baseQuery.andWhere('q.published = :published', { published: false });
    }

    if (query.bodySearchTerm) {
      baseQuery.andWhere('q.body ILIKE :term', {
        term: `%${query.bodySearchTerm}%`,
      });
    }

    const allowedSortFields: Record<SaQuizQuestionsSortBy, string> = {
      [SaQuizQuestionsSortBy.Body]: 'q.body',
      [SaQuizQuestionsSortBy.CreatedAt]: 'q.createdAt',
      [SaQuizQuestionsSortBy.UpdatedAt]: 'q.updatedAt',
    } as const;

    const sortBy =
      allowedSortFields[query.sortBy ?? SaQuizQuestionsSortBy.CreatedAt];
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    const paginatedQuery = baseQuery.clone().orderBy(sortBy, sortDirection);
    paginatedQuery.skip(query.calculateSkip()).take(query.pageSize);

    const [questions, totalCount] = await Promise.all([
      paginatedQuery.getMany(),
      baseQuery.clone().getCount(),
    ]);

    const items = questions.map((q) => QuizQuestionViewDto.mapToView(q));

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }

  async findRandomPublishedIds(limit: number): Promise<QuestionEntity[]> {
    const questions = await this.dataSource
      .getRepository(QuestionEntity)
      .createQueryBuilder('q')
      .where('q.published = :published', { published: true })
      .andWhere('q.deletedAt IS NULL')
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();

    if (questions.length < limit) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Not enough published questions',
      });
    }

    // return questions.map((q) => q.id);
    return questions;
  }
}
