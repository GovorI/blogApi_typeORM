import { Injectable } from '@nestjs/common';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { LikesAdapterForPost } from './adapters/likes-adapter-for.post';
import { LikeForPostEntity } from '../domain/like-for-post.entity';

// export interface ISqlLikeForComment {
//   commentId: string;
//   userId: string;
//   status: string;
//   createdAt: Date;
//   updatedAt: Date;
// }
//
// export interface ISqlLikeForPost {
//   postId: string;
//   userId: string;
//   status: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

@Injectable()
export class LikesPostRepository {
  constructor(
    @InjectRepository(LikeForPostEntity)
    private readonly likeForPostRepository: Repository<LikeForPostEntity>,
  ) {}

  create(data: Partial<LikeForPostEntity>): LikeForPostEntity {
    return this.likeForPostRepository.create(data);
  }

  save(like: LikeForPostEntity): Promise<LikeForPostEntity> {
    return this.likeForPostRepository.save(like);
  }

  async getLikeByPostIdAndUserIdOrFail(postId: string, userId: string) {
    const like = await this.likeForPostRepository.findOneBy({
      postId,
      userId,
    });
    if (!like) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Like not found',
      });
    }
    return like;
  }

  async deleteByPostIdAndUserId(postId: string, userId: string) {
    const deletedLike = await this.likeForPostRepository.delete({
      postId,
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
