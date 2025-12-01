import { Injectable } from '@nestjs/common';
import { PostNotFoundException } from '../../../core/domain/domain.exception';
import {
  GetPostsQueryParams,
  PostsSortBy,
} from '../api/posts/get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../api/view-dto/post.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BlogsRepository } from './blogs.repository';
import { LikeStatuses } from '../dto/like-status.dto';
import { NewestLikeInfo, PostEntity } from '../domain/post-entity';

interface RawPostQueryResult {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: string | Date; // TypeORM может вернуть как строку, так и Date
  likesCount: number;
  dislikesCount: number;
  myStatus: LikeStatuses | null;
}

interface RawNewestLikeResult {
  addedAt: string | Date;
  userId: string;
  login: string;
}

@Injectable()
export class PostsQueryRepository {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private blogsRepository: BlogsRepository,
  ) {}

  async getPostsForBlog(
    blogId: string,
    query: GetPostsQueryParams,
    currentUserId?: string,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    // Проверяем существование блога
    await this.blogsRepository.findOrNotFoundFail(blogId);

    const postsRepo = this.dataSource.getRepository(PostEntity);

    const queryBuilder = postsRepo
      .createQueryBuilder('post')
      .leftJoin('post.blog', 'blog')
      .leftJoin('PostLikes', 'pl', 'pl.postId = post.id')
      .select('post.id', 'id')
      .addSelect('post.title', 'title')
      .addSelect('post.shortDescription', 'shortDescription')
      .addSelect('post.content', 'content')
      .addSelect('post.blogId', 'blogId')
      .addSelect('post.createdAt', 'createdAt')
      .addSelect('blog.name', 'blogName')
      .addSelect('COUNT(CASE WHEN pl.status = :like THEN 1 END)', 'likesCount')
      .addSelect(
        'COUNT(CASE WHEN pl.status = :dislike THEN 1 END)',
        'dislikesCount',
      )
      .setParameter('like', LikeStatuses.Like)
      .setParameter('dislike', LikeStatuses.Dislike)
      .where('post.blogId = :blogId', { blogId })
      .andWhere('post.deletedAt IS NULL')
      .groupBy('post.id')
      .addGroupBy('blog.name');

    if (currentUserId) {
      queryBuilder.addSelect(
        'MAX(CASE WHEN pl.userId = :userId THEN pl.status ELSE NULL END)',
        'myStatus',
      );
      queryBuilder.setParameter('userId', currentUserId);
    } else {
      queryBuilder.addSelect('NULL', 'myStatus');
    }

    // Получаем totalCount до применения пагинации
    const totalCount = await queryBuilder.getCount();

    // Сортировка
    const sortBy = query.sortBy || PostsSortBy.CreatedAt;
    let sortField: string;
    if (sortBy === PostsSortBy.BlogName) {
      sortField = 'blog.name';
    } else if (sortBy === PostsSortBy.CreatedAt) {
      sortField = 'post.createdAt';
    } else {
      sortField = `post.${sortBy}`;
    }
    queryBuilder.orderBy(
      sortField,
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC',
    );

    // Пагинация
    queryBuilder
      .limit(query.pageSize)
      .offset((query.pageNumber - 1) * query.pageSize);

    const rawPosts = await queryBuilder.getRawMany<RawPostQueryResult>();

    // Добавляем newest likes для каждого поста
    const items = await Promise.all(
      rawPosts.map(async (post) => {
        const newestLikes = await this.getNewestLikes(post.id);
        return {
          id: post.id,
          title: post.title,
          shortDescription: post.shortDescription,
          content: post.content,
          blogId: post.blogId,
          blogName: post.blogName,
          createdAt: new Date(post.createdAt),
          extendedLikesInfo: {
            likesCount: Number(post.likesCount) || 0,
            dislikesCount: Number(post.dislikesCount) || 0,
            myStatus: post.myStatus || LikeStatuses.None,
            newestLikes: newestLikes,
          },
        } as PostViewDto;
      }),
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
    const postsRepo = this.dataSource.getRepository(PostEntity);

    const queryBuilder = postsRepo
      .createQueryBuilder('post')
      .leftJoin('post.blog', 'blog')
      .leftJoin('PostLikes', 'pl', 'pl.postId = post.id')
      .select('post.id', 'id')
      .addSelect('post.title', 'title')
      .addSelect('post.shortDescription', 'shortDescription')
      .addSelect('post.content', 'content')
      .addSelect('post.blogId', 'blogId')
      .addSelect('post.createdAt', 'createdAt')
      .addSelect('blog.name', 'blogName')
      .addSelect('COUNT(CASE WHEN pl.status = :like THEN 1 END)', 'likesCount')
      .addSelect(
        'COUNT(CASE WHEN pl.status = :dislike THEN 1 END)',
        'dislikesCount',
      )
      .setParameter('like', LikeStatuses.Like)
      .setParameter('dislike', LikeStatuses.Dislike)
      .where('post.deletedAt IS NULL')
      .groupBy('post.id')
      .addGroupBy('blog.name');

    if (currentUserId) {
      queryBuilder.addSelect(
        'MAX(CASE WHEN pl.userId = :userId THEN pl.status ELSE NULL END)',
        'myStatus',
      );
      queryBuilder.setParameter('userId', currentUserId);
    } else {
      queryBuilder.addSelect('NULL', 'myStatus');
    }

    // Получаем totalCount до применения пагинации
    const totalCount = await queryBuilder.getCount();

    // Сортировка и пагинация
    const sortBy = query.sortBy || PostsSortBy.CreatedAt;
    let sortField: string;
    if (sortBy === PostsSortBy.BlogName) {
      sortField = 'blog.name';
    } else if (sortBy === PostsSortBy.CreatedAt) {
      sortField = 'post.createdAt';
    } else {
      sortField = `post.${sortBy}`;
    }
    queryBuilder
      .orderBy(
        sortField,
        query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC',
      )
      .limit(query.pageSize)
      .offset((query.pageNumber - 1) * query.pageSize);

    const rawPosts = await queryBuilder.getRawMany<RawPostQueryResult>();

    const items = await Promise.all(
      rawPosts.map(async (post) => {
        const newestLikes = await this.getNewestLikes(post.id);
        return {
          id: post.id,
          title: post.title,
          shortDescription: post.shortDescription,
          content: post.content,
          blogId: post.blogId,
          blogName: post.blogName,
          createdAt: new Date(post.createdAt),
          extendedLikesInfo: {
            likesCount: Number(post.likesCount) || 0,
            dislikesCount: Number(post.dislikesCount) || 0,
            myStatus: post.myStatus || LikeStatuses.None,
            newestLikes: newestLikes,
          },
        } as PostViewDto;
      }),
    );

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }

  private async getNewestLikes(postId: string): Promise<NewestLikeInfo[]> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('pl.createdAt', 'addedAt')
      .addSelect('pl.userId', 'userId')
      .addSelect('u.login', 'login')
      .from('PostLikes', 'pl')
      .leftJoin('Users', 'u', 'pl.userId = u.id')
      .where('pl.postId = :postId', { postId })
      .andWhere('pl.status = :status', { status: LikeStatuses.Like })
      .orderBy('pl.createdAt', 'DESC')
      .limit(3)
      .getRawMany<RawNewestLikeResult>();

    return result.map((r) => ({
      addedAt: new Date(r.addedAt),
      userId: r.userId,
      login: r.login,
    }));
  }

  async getByIdOrNotFoundFail(
    id: string,
    currentUserId?: string,
  ): Promise<PostViewDto> {
    const postsRepo = this.dataSource.getRepository(PostEntity);

    const queryBuilder = postsRepo
      .createQueryBuilder('post')
      .leftJoin('post.blog', 'blog')
      .leftJoin('PostLikes', 'pl', 'pl.postId = post.id')
      .select('post.id', 'id')
      .addSelect('post.title', 'title')
      .addSelect('post.shortDescription', 'shortDescription')
      .addSelect('post.content', 'content')
      .addSelect('post.blogId', 'blogId')
      .addSelect('post.createdAt', 'createdAt')
      .addSelect('blog.name', 'blogName')
      .addSelect('COUNT(CASE WHEN pl.status = :like THEN 1 END)', 'likesCount')
      .addSelect(
        'COUNT(CASE WHEN pl.status = :dislike THEN 1 END)',
        'dislikesCount',
      )
      .setParameter('like', LikeStatuses.Like)
      .setParameter('dislike', LikeStatuses.Dislike)
      .where('post.id = :id', { id })
      .andWhere('post.deletedAt IS NULL')
      .groupBy('post.id')
      .addGroupBy('blog.name');

    if (currentUserId) {
      queryBuilder.addSelect(
        'MAX(CASE WHEN pl.userId = :userId THEN pl.status ELSE NULL END)',
        'myStatus',
      );
      queryBuilder.setParameter('userId', currentUserId);
    } else {
      queryBuilder.addSelect('NULL', 'myStatus');
    }

    const rawPost = await queryBuilder.getRawOne<RawPostQueryResult>();

    if (!rawPost) {
      throw new PostNotFoundException('Post not found');
    }

    const newestLikes = await this.getNewestLikes(id);

    return {
      id: rawPost.id,
      title: rawPost.title,
      shortDescription: rawPost.shortDescription,
      content: rawPost.content,
      blogId: rawPost.blogId,
      blogName: rawPost.blogName,
      createdAt: new Date(rawPost.createdAt),
      extendedLikesInfo: {
        likesCount: Number(rawPost.likesCount) || 0,
        dislikesCount: Number(rawPost.dislikesCount) || 0,
        myStatus: rawPost.myStatus || LikeStatuses.None,
        newestLikes: newestLikes,
      },
    } as PostViewDto;
  }
}
