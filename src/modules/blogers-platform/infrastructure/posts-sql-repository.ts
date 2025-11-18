import { Injectable } from '@nestjs/common';
import { PostEntity } from '../domain/post-entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostsAdapter } from './adapters/posts-adapter';
import { PostNotFoundException } from '../../../core/domain';

export class ISqlPost {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

@Injectable()
export class PostsSqlRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async save(post: PostEntity): Promise<PostEntity> {
    const isExists = await this.isExists(post.id);
    if (isExists) {
      return this.update(post);
    } else {
      return this.create(post);
    }
  }

  private async isExists(id: string): Promise<boolean> {
    const result: ISqlPost = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "Posts" WHERE id = $1)`,
      [id],
    );
    return result[0].exists as boolean;
  }

  private async create(post: PostEntity): Promise<PostEntity> {
    try {
      await this.dataSource.query(
        `
          INSERT INTO "Posts" (id, title, "shortDescription", content, "blogId", "createdAt", "updatedAt", "deletedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          post.id,
          post.title,
          post.shortDescription,
          post.content,
          post.blogId,
          post.createdAt,
          post.updatedAt,
          post.deletedAt,
        ],
      );
      return post;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private async update(post: PostEntity): Promise<PostEntity> {
    try {
      await this.dataSource.query(
        `
          UPDATE "Posts" SET
                                       title = $2,
                                       "shortDescription" = $3,
                                       content = $4,
                                       "updatedAt" = $5,
                                       "deletedAt" = $6
                                       WHERE id = $1`,
        [
          post.id,
          post.title,
          post.shortDescription,
          post.content,
          post.updatedAt,
          post.deletedAt,
        ],
      );
      return post;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findOrNotFoundFail(id: string): Promise<PostEntity> {
    const rawPost: ISqlPost[] = await this.dataSource.query(
      `SELECT * FROM "Posts" WHERE id = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawPost[0]) {
      throw new PostNotFoundException('Post not found');
    }
    return PostsAdapter.toEntity(rawPost[0]);
  }
}
