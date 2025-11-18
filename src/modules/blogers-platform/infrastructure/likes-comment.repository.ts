import { Injectable } from '@nestjs/common';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LikesAdapterForComment } from './adapters/likes-adapter-for.comment';
import { LikeForCommentEntity } from '../domain/like-for-comment.entity';

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
export class LikesCommentRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async save(likeStatus: LikeForCommentEntity): Promise<void> {
    const isExists = await this.isExists(
      likeStatus.commentId,
      likeStatus.userId,
    );
    if (isExists) {
      await this.update(likeStatus);
    } else {
      await this.create(likeStatus);
    }
  }

  private async isExists(commentId: string, userId: string): Promise<boolean> {
    const result: Array<{ exists: boolean }> = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "commentLikes" WHERE "commentId" = $1 AND "userId" = $2) as "exists"`,
      [commentId, userId],
    );
    return Boolean(result[0]?.exists);
  }

  private async create(likeStatus: LikeForCommentEntity) {
    try {
      await this.dataSource.query(
        `
      INSERT INTO "commentLikes" ("commentId", "userId", "status", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5)`,
        [
          likeStatus.commentId,
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

  private async update(likeStatus: LikeForCommentEntity) {
    try {
      await this.dataSource.query(
        `
      UPDATE "commentLikes" 
      SET "status" = $1,
          "updatedAt" = $2
      WHERE "commentId" = $3 AND "userId" = $4`,
        [
          likeStatus.status,
          likeStatus.updatedAt,
          likeStatus.commentId,
          likeStatus.userId,
        ],
      );
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async getLikeByCommentIdAndUserIdOrNotFoundFail(
    commentId: string,
    userId: string,
  ): Promise<LikeForCommentEntity> {
    const rawLike: ISqlLikeForComment[] = await this.dataSource.query(
      `SELECT * FROM "commentLikes" WHERE "commentId" = $1 AND "userId" = $2`,
      [commentId, userId],
    );
    if (!rawLike[0]) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Comment like not found',
      });
    }
    return LikesAdapterForComment.toEntity(rawLike[0]);
  }

  async deleteByCommentIdAndUserId(commentId: string, userId: string) {
    await this.dataSource.query(
      `DELETE FROM "commentLikes" WHERE "commentId" = $1 AND "userId" = $2`,
      [commentId, userId],
    );
  }
}
