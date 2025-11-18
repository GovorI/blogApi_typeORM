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
import { ISqlBlog } from './blogs.sql-repository';
import { BlogsAdapter } from './adapters/blogs-adapter';

@Injectable()
export class BlogsQueryRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getByIdOrNotFoundFail(id: string): Promise<BlogViewDto> {
    // Используем правильное имя столбца "deletedAt"
    const blogs: ISqlBlog[] = await this.dataSource.query(
      `
      SELECT * FROM "Blogs" WHERE id = $1 AND "deletedAt" IS NULL
    `,
      [id],
    );
    if (!blogs[0]) {
      throw new BlogNotFoundException('Blog not found');
    }
    const blogEntity = BlogsAdapter.toEntity(blogs[0]);
    return BlogViewDto.mapToView(blogEntity);
  }

  async getAll(
    query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    const params: any[] = [];

    let filter = `WHERE "deletedAt" IS NULL`;
    if (query.searchNameTerm) {
      params.push(`%${query.searchNameTerm}%`);
      filter += ` AND name ILIKE $${params.length}`;
    }

    const sortField = query.sortBy || BlogsSortBy.CreatedAt;
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
    const orderBy = `ORDER BY "${sortField}" ${sortDirection}`;

    const limit = query.pageSize;
    const offset = (query.pageNumber - 1) * query.pageSize;
    params.push(limit, offset);
    const pagination = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const totalCountQuery = `SELECT count(*) FROM "Blogs" ${filter}`;
    const totalCountResult: { count: string }[] = await this.dataSource.query(
      totalCountQuery,
      params.slice(0, params.length - 2),
    );
    const totalCount = parseInt(totalCountResult[0].count, 10);

    const blogsQuery = `SELECT * FROM "Blogs" ${filter} ${orderBy} ${pagination}`;
    const blogsSql: ISqlBlog[] = await this.dataSource.query(
      blogsQuery,
      params,
    );

    const items = blogsSql
      .map(BlogsAdapter.toEntity)
      .map(BlogViewDto.mapToView);

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }
}
