import { Injectable } from '@nestjs/common';
import { BlogNotFoundException } from '../../../core/domain/domain.exception';
import { BlogViewDto } from '../api/view-dto/blog.view-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import {
  BlogsSortBy,
  GetBlogsQueryParams,
} from '../api/blogs/get-blogs-query-params.input-dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BlogEntity } from '../domain/blog-entity';

@Injectable()
export class BlogsQueryRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getByIdOrNotFoundFail(id: string): Promise<BlogViewDto> {
    const blog = await this.dataSource
      .getRepository(BlogEntity)
      .createQueryBuilder('blog')
      .where('blog.id = :id', { id })
      .andWhere('blog.deletedAt IS NULL')
      .getOne();
    if (!blog) {
      throw new BlogNotFoundException('Blog not found');
    }

    return BlogViewDto.mapToView(blog);
  }

  async getAll(
    query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    const blogsRepository = this.dataSource.getRepository(BlogEntity);
    const baseQuery = blogsRepository
      .createQueryBuilder('blog')
      .where('blog.deletedAt IS NULL');

    if (query.searchNameTerm) {
      baseQuery.andWhere('blog.name ILIKE :searchNameTerm', {
        searchNameTerm: `%${query.searchNameTerm}%`,
      });
    }

    const allowedSortFields: Record<BlogsSortBy, string> = {
      [BlogsSortBy.Name]: 'blog.name',
      [BlogsSortBy.Description]: 'blog.description',
      [BlogsSortBy.CreatedAt]: 'blog.createdAt',
    } as const;

    const sortBy = allowedSortFields[query.sortBy ?? BlogsSortBy.CreatedAt];
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    const paginatedQuery = baseQuery.clone().orderBy(sortBy, sortDirection);

    paginatedQuery.skip(query.calculateSkip()).take(query.pageSize);

    const [blogs, totalCount] = await Promise.all([
      paginatedQuery.getMany(),
      baseQuery.clone().getCount(),
    ]);

    const items = blogs.map((blog) => BlogViewDto.mapToView(blog));

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }
}
