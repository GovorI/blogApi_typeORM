import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BlogEntity } from '../domain/blog-entity';
import { BlogsAdapter } from './adapters/blogs-adapter';
import { BlogNotFoundException } from '../../../core/domain';

export interface ISqlBlog {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  isMembership: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

@Injectable()
export class BlogsSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async save(blog: BlogEntity): Promise<BlogEntity> {
    const isExists = await this.isExists(blog.id);
    if (isExists) {
      return this.update(blog);
    } else {
      return this.create(blog);
    }
  }

  private async isExists(id: string): Promise<boolean> {
    const result: ISqlBlog = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "Blogs" WHERE id = $1)`,
      [id],
    );
    return result[0].exists;
  }

  private async create(blog: BlogEntity): Promise<BlogEntity> {
    try {
      await this.dataSource.query(
        `
      INSERT INTO "Blogs" (id, name, description, "websiteUrl", "isMembership", "createdAt", "updatedAt", "deletedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     `,
        [
          blog.id,
          blog.name,
          blog.description,
          blog.websiteUrl,
          blog.isMembership,
          blog.createdAt,
          blog.updatedAt,
          blog.deletedAt,
        ],
      );
      return blog;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private async update(blog: BlogEntity): Promise<BlogEntity> {
    try {
      await this.dataSource.query(
        `
      UPDATE "Blogs" SET
                                       name = $2,
                                       description = $3,
                                       "websiteUrl" = $4,
                                       "isMembership" = $5,
                                       "updatedAt" = $6,
                                       "deletedAt" = $7
                                       WHERE id = $1`,
        [
          blog.id,
          blog.name,
          blog.description,
          blog.websiteUrl,
          blog.isMembership,
          blog.updatedAt,
          blog.deletedAt,
        ],
      );
      return blog;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findOrNotFoundFail(id: string): Promise<BlogEntity> {
    const rawBlog: ISqlBlog[] = await this.dataSource.query(
      `SELECT * FROM "Blogs" WHERE id = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawBlog[0]) {
      throw new BlogNotFoundException('Blog not found');
    }
    return BlogsAdapter.toEntity(rawBlog[0]);
  }
}
