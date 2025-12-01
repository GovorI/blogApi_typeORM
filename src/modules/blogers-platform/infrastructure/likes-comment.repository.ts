import { Injectable } from '@nestjs/common';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  constructor(
    @InjectRepository(LikeForCommentEntity)
    private readonly likeForCommentRepository: Repository<LikeForCommentEntity>,
  ) {}

  async save(like: LikeForCommentEntity): Promise<LikeForCommentEntity> {
    return this.likeForCommentRepository.save(like);
  }

  create(like: Partial<LikeForCommentEntity>): LikeForCommentEntity {
    return this.likeForCommentRepository.create(like);
  }

  async getLikeByCommentIdAndUserIdOrNotFoundFail(
    commentId: string,
    userId: string,
  ): Promise<LikeForCommentEntity> {
    const like = await this.likeForCommentRepository.findOneBy({
      commentId,
      userId,
    });
    if (!like) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Comment like not found',
      });
    }
    return like;

    // const rawLike: ISqlLikeForComment[] = await this.dataSource.query(
    //   `SELECT * FROM "commentLikes" WHERE "commentId" = $1 AND "userId" = $2`,
    //   [commentId, userId],
    // );
    // if (!rawLike[0]) {
    //   throw new DomainException({
    //     code: DomainExceptionCode.NotFound,
    //     message: 'Comment like not found',
    //   });
    // }
    // return LikesAdapterForComment.toEntity(rawLike[0]);
  }

  async deleteByCommentIdAndUserId(commentId: string, userId: string) {
    // await this.dataSource.query(
    //   `DELETE FROM "commentLikes" WHERE "commentId" = $1 AND "userId" = $2`,
    //   [commentId, userId],
    // );
    const deletedLike = await this.likeForCommentRepository.delete({
      commentId,
      userId,
    });
    if (!deletedLike.affected) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Like not found',
      });
    }
  }
}
