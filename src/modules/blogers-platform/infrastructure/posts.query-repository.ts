import { Injectable } from '@nestjs/common';
import { PostNotFoundException } from '../../../core/domain/domain.exception';
import {
  GetPostsQueryParams,
  PostsSortBy,
} from '../api/posts/get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
// Импортируем и DTO, и наш новый тип-контракт
import { PostViewDto, PostViewModelData } from '../api/view-dto/post.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ISqlPost } from './posts-sql-repository';
import { BlogsSqlRepository } from './blogs.sql-repository';
import { LikeStatuses } from '../dto/like-status.dto';

export interface NewestLikeDto {
  addedAt: string;
  userId: string;
  login: string;
}

@Injectable()
export class PostsQueryRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private blogsSqlRepository: BlogsSqlRepository,
  ) {}

  private async _mapDbPostToView(
    post: ISqlPost & {
      blogName?: string;
      likesCount?: number;
      dislikesCount?: number;
      myStatus?: 'Like' | 'Dislike' | 'None';
      newestLikes?: Array<{ addedAt: Date; userId: string; login: string }>;
    },
  ): Promise<PostViewDto> {
    let blogName = post.blogName;
    if (!blogName) {
      const blogResult: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM "Blogs" WHERE id = $1`,
        [post.blogId],
      );
      blogName = blogResult[0]?.name || 'Unknown Blog';
    }

    const postForView: PostViewModelData = {
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName: blogName,
      createdAt: new Date(post.createdAt),
      extendedLikesInfo: {
        likesCount: post.likesCount || 0,
        dislikesCount: post.dislikesCount || 0,
        myStatus:
          (post.myStatus as 'Like' | 'Dislike' | 'None') || LikeStatuses.None,
        newestLikes: post.newestLikes || [],
      },
    };

    return PostViewDto.mapToView(postForView);
  }

  async getPostsForBlog(
    blogId: string,
    query: GetPostsQueryParams,
    currentUserId?: string,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    await this.blogsSqlRepository.findOrNotFoundFail(blogId);
    const params: any[] = [blogId];

    if (currentUserId) {
      params.push(currentUserId);
    }

    const limit = query.pageSize;
    const offset = (query.pageNumber - 1) * query.pageSize;
    params.push(limit, offset);

    const filter = `WHERE p."blogId" = $1 AND p."deletedAt" IS NULL`;
    const sortBy = query.sortBy || PostsSortBy.CreatedAt;
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
    // Выбираем корректную колонку для сортировки: по имени блога сортируем через таблицу Blogs
    const sortColumnForBlog =
      sortBy === PostsSortBy.BlogName ? 'b."name"' : `p."${sortBy}"`;

    // Parameter indices: $1=blogId, $2=currentUserId (if exists), $3=limit, $4=offset
    const postsWithLikesQuery = `
      WITH post_likes AS (
        SELECT 
          pl."postId",
          COUNT(CASE WHEN pl.status = 'Like' THEN 1 END) AS likes_count,
          COUNT(CASE WHEN pl.status = 'Dislike' THEN 1 END) AS dislikes_count
          ${currentUserId ? `, MAX(CASE WHEN pl."userId" = $2::UUID THEN pl.status ELSE NULL END) AS my_status` : `, NULL AS my_status`}
        FROM "postLikes" pl
        INNER JOIN "Posts" p ON pl."postId" = p.id
        WHERE p."blogId" = $1 AND p."deletedAt" IS NULL
        GROUP BY pl."postId"
      )
      SELECT 
        p.*,
        b.name AS "blogName",
        COALESCE(pl.likes_count, 0)::int AS "likesCount",
        COALESCE(pl.dislikes_count, 0)::int AS "dislikesCount",
        COALESCE(pl.my_status, NULL) AS "myStatus"
      FROM "Posts" p
      LEFT JOIN "Blogs" b ON p."blogId" = b.id
      LEFT JOIN "post_likes" pl ON p.id = pl."postId"
      ${filter}
      ORDER BY ${sortColumnForBlog} ${sortDirection}
      LIMIT $${currentUserId ? 3 : 2} OFFSET $${currentUserId ? 4 : 3}
    `;

    const totalCountQuery = `SELECT count(*) FROM "Posts" p ${filter}`;
    const totalCountResult: { count: string }[] = await this.dataSource.query(
      totalCountQuery,
      params.slice(0, 1), // Only pass blogId for count query
    );
    const totalCount = parseInt(totalCountResult[0].count, 10);

    const rawPosts: (ISqlPost & {
      blogName?: string;
      likesCount?: number;
      dislikesCount?: number;
      myStatus?: string;
    })[] = await this.dataSource.query(postsWithLikesQuery, params);

    // Fetch newest likes for each post
    const postsWithNewestLikes = await Promise.all(
      rawPosts.map(async (post) => {
        const newestLikesQuery = `
          SELECT 
            pl."createdAt" AS "addedAt",
            pl."userId",
            u.login
          FROM "postLikes" pl
          LEFT JOIN "Users" u ON pl."userId" = u.id
          WHERE pl."postId" = $1 
            AND pl.status = 'Like'
          ORDER BY pl."createdAt" DESC
          LIMIT 3
        `;
        const newestLikes: NewestLikeDto[] = await this.dataSource.query(
          newestLikesQuery,
          [post.id],
        );
        return {
          ...post,
          newestLikes: newestLikes.map((like: NewestLikeDto) => ({
            addedAt: new Date(like.addedAt),
            userId: like.userId,
            login: like.login,
          })),
        };
      }),
    );

    const items = await Promise.all(
      postsWithNewestLikes.map((p) =>
        this._mapDbPostToView({
          ...p,
          myStatus: p.myStatus as 'Like' | 'Dislike' | 'None' | undefined,
        }),
      ),
    );

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }

  async getAll(
    query: GetPostsQueryParams,
    currentUserId?: string,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const params: any[] = [];

    if (currentUserId) {
      params.push(currentUserId);
    }

    const limit = query.pageSize;
    const offset = (query.pageNumber - 1) * query.pageSize;
    params.push(limit, offset);

    const filter = `WHERE p."deletedAt" IS NULL`;
    const sortBy = query.sortBy || PostsSortBy.CreatedAt;
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
    // Выбираем корректную колонку для сортировки: по имени блога сортируем через таблицу Blogs
    const sortColumn =
      sortBy === PostsSortBy.BlogName ? 'b."name"' : `p."${sortBy}"`;

    // Parameter indices: $1=currentUserId (if exists), $2=limit, $3=offset
    const postsWithLikesQuery = `
      WITH post_likes AS (
        SELECT 
          pl."postId",
          COUNT(CASE WHEN pl.status = 'Like' THEN 1 END) AS likes_count,
          COUNT(CASE WHEN pl.status = 'Dislike' THEN 1 END) AS dislikes_count
          ${currentUserId ? `, MAX(CASE WHEN pl."userId" = $1::UUID THEN pl.status ELSE NULL END) AS my_status` : `, NULL AS my_status`}
        FROM "postLikes" pl
        INNER JOIN "Posts" p ON pl."postId" = p.id
        WHERE p."deletedAt" IS NULL
        GROUP BY pl."postId"
      )
      SELECT 
        p.*,
        b.name AS "blogName",
        COALESCE(pl.likes_count, 0)::int AS "likesCount",
        COALESCE(pl.dislikes_count, 0)::int AS "dislikesCount",
        COALESCE(pl.my_status, NULL) AS "myStatus"
      FROM "Posts" p
      LEFT JOIN "Blogs" b ON p."blogId" = b.id
      LEFT JOIN "post_likes" pl ON p.id = pl."postId"
      ${filter}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${currentUserId ? 2 : 1} OFFSET $${currentUserId ? 3 : 2}
    `;

    const totalCountQuery = `SELECT count(*) FROM "Posts" p ${filter}`;
    const totalCountResult: { count: string }[] =
      await this.dataSource.query(totalCountQuery);
    const totalCount: number = parseInt(totalCountResult[0].count, 10);

    const rawPosts: (ISqlPost & {
      blogName?: string;
      likesCount?: number;
      dislikesCount?: number;
      myStatus?: string;
    })[] = await this.dataSource.query(postsWithLikesQuery, params);

    // Fetch newest likes for each post
    const postsWithNewestLikes = await Promise.all(
      rawPosts.map(async (post) => {
        const newestLikesQuery = `
          SELECT 
            pl."createdAt" AS "addedAt",
            pl."userId",
            u.login
          FROM "postLikes" pl
          LEFT JOIN "Users" u ON pl."userId" = u.id
          WHERE pl."postId" = $1 
            AND pl.status = 'Like'
          ORDER BY pl."createdAt" DESC
          LIMIT 3
        `;
        const newestLikes: NewestLikeDto[] = await this.dataSource.query(
          newestLikesQuery,
          [post.id],
        );
        return {
          ...post,
          newestLikes: newestLikes.map((like: NewestLikeDto) => ({
            addedAt: new Date(like.addedAt),
            userId: like.userId,
            login: like.login,
          })),
        };
      }),
    );

    const items = await Promise.all(
      postsWithNewestLikes.map((p) =>
        this._mapDbPostToView({
          ...p,
          myStatus: p.myStatus as 'Like' | 'Dislike' | 'None' | undefined,
        }),
      ),
    );

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }

  async getByIdOrNotFoundFail(
    id: string,
    currentUserId?: string,
  ): Promise<PostViewDto> {
    const params = [id];
    if (currentUserId) {
      params.push(currentUserId);
    }

    // Parameter indices: $1=id, $2=currentUserId (if exists)
    const postQuery = `
      WITH post_likes AS (
        SELECT 
          pl."postId",
          COUNT(CASE WHEN pl.status = 'Like' THEN 1 END) AS likes_count,
          COUNT(CASE WHEN pl.status = 'Dislike' THEN 1 END) AS dislikes_count
          ${currentUserId ? `, MAX(CASE WHEN pl."userId" = $2::UUID THEN pl.status ELSE NULL END) AS my_status` : `, NULL AS my_status`}
        FROM "postLikes" pl
        INNER JOIN "Posts" p ON pl."postId" = p.id
        WHERE pl."postId" = $1 AND p."deletedAt" IS NULL
        GROUP BY pl."postId"
      )
      SELECT 
        p.*,
        b.name AS "blogName",
        COALESCE(pl.likes_count, 0)::int AS "likesCount",
        COALESCE(pl.dislikes_count, 0)::int AS "dislikesCount",
        COALESCE(pl.my_status, NULL) AS "myStatus"
      FROM "Posts" p
      LEFT JOIN "Blogs" b ON p."blogId" = b.id
      LEFT JOIN "post_likes" pl ON p.id = pl."postId"
      WHERE p.id = $1 AND p."deletedAt" IS NULL
    `;

    const rawPosts: (ISqlPost & {
      blogName?: string;
      likesCount?: number;
      dislikesCount?: number;
      myStatus?: string;
    })[] = await this.dataSource.query(postQuery, params);

    if (!rawPosts[0]) {
      throw new PostNotFoundException('Post not found');
    }

    // Get newest likes for the post
    const newestLikesQuery = `
      SELECT 
        pl."createdAt" AS "addedAt",
        pl."userId",
        u.login
      FROM "postLikes" pl
      LEFT JOIN "Users" u ON pl."userId" = u.id
      WHERE pl."postId" = $1 
        AND pl.status = 'Like'
      ORDER BY pl."createdAt" DESC
      LIMIT 3
    `;
    const newestLikes: NewestLikeDto[] = await this.dataSource.query(
      newestLikesQuery,
      [id],
    );

    const postWithLikes = {
      ...rawPosts[0],
      newestLikes: newestLikes.map((like: NewestLikeDto) => ({
        addedAt: new Date(like.addedAt),
        userId: like.userId,
        login: like.login,
      })),
    };

    return this._mapDbPostToView({
      ...postWithLikes,
      myStatus: postWithLikes.myStatus as
        | 'Like'
        | 'Dislike'
        | 'None'
        | undefined,
    });
  }
}
