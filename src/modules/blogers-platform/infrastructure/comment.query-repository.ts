import { Injectable } from '@nestjs/common';
import { GetCommentsQueryParams } from '../api/comments/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { CommentViewDto } from '../api/view-dto/comment.view-dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CommentNotFoundException } from '../../../core/domain/domain.exception';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { PostsRepository } from './posts.repository';
import { CommentEntity } from '../domain/comment.entity';

export interface RawSqlComment {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  userLogin: string;
  likesCount: string | number;
  dislikesCount: string | number;
  myStatus?: 'Like' | 'Dislike' | 'None';
}

interface RawCommentQueryResult {
  id: string;
  content: string;
  createdAt: string | Date;
  userId: string;
  userLogin: string;
  likesCount: number;
  dislikesCount: number;
  myStatus: 'Like' | 'Dislike' | null;
}

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private postsSqlRepository: PostsRepository,
  ) {}

  async getByIdOrNotFoundFail(
    commentId: string,
    currentUserId?: string,
  ): Promise<CommentViewDto> {
    const commentsRepo = this.dataSource.getRepository(CommentEntity);
    const queryBuilder = commentsRepo
      .createQueryBuilder('comment')
      .leftJoin('Users', 'user', 'user.id = comment.userId')
      .leftJoin('CommentLikes', 'cl', 'cl.commentId = comment.id')
      .select([
        'comment.id as "id"',
        'comment.content as "content"',
        'comment.createdAt as "createdAt"',
        'user.id as "userId"',
        'user.login as "userLogin"',
      ])
      .addSelect(
        'COUNT(CASE WHEN cl.status = :likeStatus THEN 1 ELSE NULL END)',
        'likesCount',
      )
      .setParameter('likeStatus', 'Like')
      .addSelect(
        'COUNT(CASE WHEN cl.status = :dislikeStatus THEN 1 ELSE NULL END)',
        'dislikesCount',
      )
      .setParameter('dislikeStatus', 'Dislike')
      .where('comment.id = :commentId', { commentId })
      .andWhere('comment.deletedAt IS NULL')
      .groupBy('comment.id')
      .addGroupBy('comment.content')
      .addGroupBy('comment.createdAt')
      .addGroupBy('user.id')
      .addGroupBy('user.login');

    if (currentUserId) {
      queryBuilder
        .addSelect(
          'MAX(CASE WHEN cl.userId = :currentUserId THEN cl.status ELSE NULL END)',
          'myStatus',
        )
        .setParameter('currentUserId', currentUserId);
    } else {
      queryBuilder.addSelect('NULL', 'myStatus');
    }

    const rawComment = await queryBuilder.getRawOne<RawCommentQueryResult>();

    if (!rawComment) {
      throw new CommentNotFoundException('Comment not found');
    }

    return {
      id: rawComment.id,
      content: rawComment.content,
      createdAt: new Date(rawComment.createdAt),
      commentatorInfo: {
        userId: rawComment.userId,
        userLogin: rawComment.userLogin,
      },
      likesInfo: {
        likesCount: parseInt(String(rawComment.likesCount || 0), 10),
        dislikesCount: parseInt(String(rawComment.dislikesCount || 0), 10),
        myStatus: rawComment.myStatus || 'None',
      },
    } as CommentViewDto;
  }

  async getAllCommentsForPost(
    postId: string,
    query: GetCommentsQueryParams,
    currentUserId?: string,
  ): Promise<PaginatedViewDto<CommentViewDto[]>> {
    await this.postsSqlRepository.findOrNotFoundFail(postId);

    const skip = query.calculateSkip();
    const limit = query.pageSize;
    const commentsRepo = this.dataSource.getRepository(CommentEntity);

    const queryBuilder = commentsRepo
      .createQueryBuilder('comment')
      .leftJoin('Users', 'user', 'user.id = comment.userId')
      .leftJoin('CommentLikes', 'cl', 'cl.commentId = comment.id')
      .select([
        'comment.id as "id"',
        'comment.content as "content"',
        'comment.createdAt as "createdAt"',
        'user.id as "userId"',
        'user.login as "userLogin"',
      ])
      .addSelect(
        'COUNT(CASE WHEN cl.status = :likeStatus THEN 1 ELSE NULL END)',
        'likesCount',
      )
      .setParameter('likeStatus', 'Like')
      .addSelect(
        'COUNT(CASE WHEN cl.status = :dislikeStatus THEN 1 ELSE NULL END)',
        'dislikesCount',
      )
      .setParameter('dislikeStatus', 'Dislike')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.deletedAt IS NULL')
      .groupBy('comment.id')
      .addGroupBy('comment.content')
      .addGroupBy('comment.createdAt')
      .addGroupBy('user.id')
      .addGroupBy('user.login');

    if (currentUserId) {
      queryBuilder
        .addSelect(
          'MAX(CASE WHEN cl.userId = :currentUserId THEN cl.status ELSE NULL END)',
          'myStatus',
        )
        .setParameter('currentUserId', currentUserId);
    } else {
      queryBuilder.addSelect('NULL', 'myStatus');
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortField = `comment.${sortBy}`;
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
    queryBuilder.orderBy(sortField, sortDirection);

    // Получаем общее количество комментариев до применения пагинации
    // getCount() не работает корректно с GROUP BY, поэтому делаем отдельный запрос
    const totalCount = await commentsRepo
      .createQueryBuilder('comment')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.deletedAt IS NULL')
      .getCount();

    // Применяем пагинацию с помощью limit и offset
    queryBuilder.limit(limit).offset(skip);

    const rawComments = await queryBuilder.getRawMany<RawCommentQueryResult>();

    const items = rawComments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: new Date(comment.createdAt),
      commentatorInfo: {
        userId: comment.userId,
        userLogin: comment.userLogin,
      },
      likesInfo: {
        likesCount: parseInt(String(comment.likesCount || 0), 10),
        dislikesCount: parseInt(String(comment.dislikesCount || 0), 10),
        myStatus: comment.myStatus || 'None',
      },
    })) as CommentViewDto[];

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    });
  }
}
