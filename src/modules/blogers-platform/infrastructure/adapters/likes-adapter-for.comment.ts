import { ISqlLikeForComment } from '../likes-comment.repository';
import { LikeForCommentEntity } from '../../domain/like-for-comment.entity';

export class LikesAdapterForComment {
  static toEntity(sqlLike: ISqlLikeForComment): LikeForCommentEntity {
    return new LikeForCommentEntity({
      commentId: sqlLike.commentId,
      userId: sqlLike.userId,
      status: sqlLike.status,
      createdAt: sqlLike.createdAt,
      updatedAt: sqlLike.updatedAt,
    });
  }
}
