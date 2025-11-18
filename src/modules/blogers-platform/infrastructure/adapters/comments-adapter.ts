import { ISqlComment } from '../comment.repository';
import { CommentEntity } from '../../domain/comment-entity';

export class CommentsAdapter {
  static toEntity(sqlComment: ISqlComment) {
    return new CommentEntity({
      id: sqlComment.id,
      content: sqlComment.content,
      postId: sqlComment.postId,
      userId: sqlComment.userId,
      createdAt: new Date(sqlComment.createdAt),
      updatedAt: new Date(sqlComment.updatedAt),
      deletedAt: sqlComment.deletedAt ? new Date(sqlComment.deletedAt) : null,
    });
  }
}
