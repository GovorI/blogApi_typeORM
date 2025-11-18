import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CommentEntity } from '../domain/comment-entity';
import { CommentNotFoundException } from '../../../core/domain/domain.exception';
import { CommentsAdapter } from './adapters/comments-adapter';
import { DataSource } from 'typeorm';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

export interface ISqlComment {
  id: string;
  content: string;
  postId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class CommentRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async save(comment: CommentEntity) {
    try {
      const isExists = await this.isExists(comment.id);
      if (isExists) {
        return this.update(comment);
      } else {
        return this.create(comment);
      }
    } catch (e) {
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment save',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }

  private async isExists(id: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS(SELECT 1 FROM "Comments" WHERE id = $1) as "exists"`,
        [id],
      );
      console.log('result of checking if comment exists:', result[0].exists);
      return result[0].exists as boolean;
    } catch (e) {
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment save',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }

  private async create(comment: CommentEntity) {
    try {
      console.log('Creating comment with data:', {
        id: comment.id,
        content: comment.content,
        postId: comment.postId,
        userId: comment.userId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        deletedAt: comment.deletedAt,
      });
      const result: ISqlComment[] = await this.dataSource.query(
        `
          INSERT INTO "Comments" (id, content, "postId", "userId", "createdAt", "updatedAt", "deletedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
        [
          comment.id,
          comment.content,
          comment.postId,
          comment.userId,
          comment.createdAt,
          comment.updatedAt,
          comment.deletedAt,
        ],
      );
      console.log('Created comment:', result[0]);
      return result[0];
    } catch (e) {
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment save',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }

  private async update(comment: CommentEntity) {
    try {
      await this.dataSource.query(
        `
          UPDATE "Comments" SET
                                       content = $2,
                                       "updatedAt" = $3,
                                       "deletedAt" = $4
                                       WHERE id = $1`,
        [comment.id, comment.content, new Date(), comment.deletedAt],
      );
      return comment;
    } catch (e) {
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment save',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }

  async findByIdOrNotFoundFail(id: string): Promise<CommentEntity> {
    const rawComment: ISqlComment[] = await this.dataSource.query(
      `SELECT * FROM "Comments" WHERE id = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawComment[0]) {
      throw new CommentNotFoundException('Comment not found');
    }
    return CommentsAdapter.toEntity(rawComment[0]);
  }
}
