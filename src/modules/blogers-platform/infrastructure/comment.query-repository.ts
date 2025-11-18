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
import { PostsSqlRepository } from './posts-sql-repository';

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

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private postsSqlRepository: PostsSqlRepository,
  ) {}

  async getByIdOrNotFoundFail(
    commentId: string,
    currentUserId?: string,
  ): Promise<CommentViewDto> {
    try {
      const query = `SELECT
        c.id,
        c.content,
        c."createdAt",
        u.id AS "userId",
        u.login AS "userLogin",
        (
          SELECT COUNT(*)
          FROM "commentLikes" cl
          WHERE cl."commentId" = c.id AND cl.status = 'Like'
        ) AS "likesCount",
        (
          SELECT COUNT(*)
          FROM "commentLikes" cl
          WHERE cl."commentId" = c.id AND cl.status = 'Dislike'
        ) AS "dislikesCount",
        CASE
          WHEN $2::UUID IS NOT NULL THEN (
            SELECT cl.status
            FROM "commentLikes" cl
            WHERE cl."commentId" = c.id AND cl."userId" = $2::UUID
          )
          ELSE NULL
        END AS "myStatus"
      FROM
        "Comments" c
      LEFT JOIN
        "Users" u ON c."userId" = u.id
      WHERE
        c.id = $1 AND c."deletedAt" IS NULL
      `;

      console.log('Executing query with parameters:', {
        commentId,
        currentUserId,
      });
      const result: RawSqlComment[] = await this.dataSource.query(query, [
        commentId,
        currentUserId,
      ]);
      console.log('Query result:', result);

      if (!result[0]) {
        throw new CommentNotFoundException('Comment not found');
      }

      return CommentViewDto.mapToView(result[0]);
    } catch (e) {
      console.log('Error in getByIdOrNotFoundFail:', e);
      // If it's already a DomainException, re-throw it as-is
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment retrieval',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }

  async getAllCommentsForPost(
    postId: string,
    query: GetCommentsQueryParams,
    currentUserId?: string,
  ): Promise<PaginatedViewDto<CommentViewDto[]>> {
    try {
      await this.postsSqlRepository.findOrNotFoundFail(postId);
      console.log('CURRENT USER ID -->', currentUserId);
      const skip = query.calculateSkip();
      const limit = query.pageSize;
      const sortField = query.sortBy ? `"${query.sortBy}"` : '"createdAt"';
      const sortDirection =
        query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

      const params: any[] = [postId, limit];
      if (currentUserId) {
        params.push(currentUserId);
      } else {
        params.push(null); // Pass null instead of undefined
      }
      params.push(skip);

      const queryStr = `
    WITH comment_likes AS (
      SELECT 
        cl."commentId" AS comment_id,
        COUNT(CASE WHEN cl.status = 'Like' THEN 1 END) AS likes_count,
        COUNT(CASE WHEN cl.status = 'Dislike' THEN 1 END) AS dislikes_count,
        MAX(CASE WHEN cl."userId" = $3::UUID THEN cl.status ELSE NULL END) AS my_status
      FROM "commentLikes" cl
      INNER JOIN "Comments" c ON cl."commentId" = c.id
      WHERE c."postId" = $1 AND c."deletedAt" IS NULL
      GROUP BY cl."commentId"
    )
    SELECT 
      c.id,
      c.content,
      c."createdAt",
      u.id AS "userId",
      u.login AS "userLogin",
      COALESCE(cl.likes_count, 0)::int AS "likesCount",
      COALESCE(cl.dislikes_count, 0)::int AS "dislikesCount",
      COALESCE(cl.my_status, NULL) AS "myStatus",
      COUNT(*) OVER() AS "totalCount"
    FROM "Comments" c
    LEFT JOIN "Users" u ON c."userId" = u.id
    LEFT JOIN "comment_likes" cl ON c.id = cl.comment_id
    WHERE c."postId" = $1 AND c."deletedAt" IS NULL
    ORDER BY c.${sortField} ${sortDirection}
    LIMIT $2 OFFSET $4
  `;

      console.log('Executing getAllCommentsForPost query with parameters:', {
        postId,
        limit,
        currentUserId,
        skip,
      });
      const result = await this.dataSource.query<
        Array<RawSqlComment & { totalCount: string }>
      >(queryStr, params);
      console.log('Query result:', result);

      // Handle case when there are no comments
      if (result.length === 0) {
        console.log('No comments found, getting total count separately');
        // Get total count separately when there are no results
        const countQuery = `
          SELECT COUNT(*) as "totalCount"
          FROM "Comments" c
          WHERE c."postId" = $1 AND c."deletedAt" IS NULL
        `;
        const countResult = await this.dataSource.query(countQuery, [postId]);
        console.log('Count query result:', countResult);
        const totalCount = parseInt(countResult[0]?.totalCount || '0', 10);

        return PaginatedViewDto.mapToView({
          items: [],
          totalCount,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        });
      }

      const totalCount = parseInt(result[0]?.totalCount || '0', 10);
      const items = result.map((comment) => CommentViewDto.mapToView(comment));

      return PaginatedViewDto.mapToView({
        items,
        totalCount,
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      });
    } catch (e) {
      console.log('Error in getAllCommentsForPost:', e);
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment retrieval',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }
}
