import { LikeForPostEntity } from '../../domain/like-for-post.entity';
import { ISqlLikeForPost } from '../likes-comment.repository';

export class LikesAdapterForPost {
  static toEntity(sqlLike: ISqlLikeForPost): LikeForPostEntity {
    return new LikeForPostEntity({
      postId: sqlLike.postId,
      userId: sqlLike.userId,
      status: sqlLike.status,
      createdAt: sqlLike.createdAt,
      updatedAt: sqlLike.updatedAt,
    });
  }
}
