import { Injectable } from '@nestjs/common';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LikesAdapterForPost } from './adapters/likes-adapter-for.post';
import { LikeForPostEntity } from '../domain/like-for-post.entity';

export interface ISqlLikeForComment {
  commentId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISqlLikeForPost {
  postId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LikesPostRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getLikeByPostIdAndUserIdOrFail(postId: string, userId: string) {
    const rawLike = await this.dataSource.query(
      `SELECT * FROM "postLikes" WHERE "postId" = $1 AND "userId" = $2`,
      [postId, userId],
    );
    if (!rawLike[0]) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Like not found',
      });
    }
    return LikesAdapterForPost.toEntity(rawLike[0]);
  }

  async save(likeStatus: LikeForPostEntity): Promise<void> {
    const isExists = await this.isExists(likeStatus.postId, likeStatus.userId);
    if (isExists) {
      await this.update(likeStatus);
    } else {
      await this.create(likeStatus);
    }
  }

  private async isExists(postId: string, userId: string): Promise<boolean> {
    const result: Array<{ exists: boolean }> = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "postLikes" WHERE "postId" = $1 AND "userId" = $2)`,
      [postId, userId],
    );
    return Boolean(result[0]?.exists);
  }

  private async create(likeStatus: LikeForPostEntity) {
    try {
      await this.dataSource.query(
        `
      INSERT INTO "postLikes" ("postId", "userId", "status", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5)`,
        [
          likeStatus.postId,
          likeStatus.userId,
          likeStatus.status,
          likeStatus.createdAt,
          likeStatus.updatedAt,
        ],
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  private async update(likeStatus: LikeForPostEntity) {
    try {
      await this.dataSource.query(
        `
      UPDATE "postLikes" 
      SET "status" = $1,
          "updatedAt" = $2
      WHERE "postId" = $3 AND "userId" = $4`,
        [
          likeStatus.status,
          likeStatus.updatedAt,
          likeStatus.postId,
          likeStatus.userId,
        ],
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async deleteByPostIdAndUserId(postId: string, userId: string) {
    await this.dataSource.query(
      `DELETE FROM "postLikes" WHERE "postId" = $1 AND "userId" = $2`,
      [postId, userId],
    );
  }
}
