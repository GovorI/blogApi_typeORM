import { RawSqlComment } from '../../infrastructure/comment.query-repository';
import { LikeStatuses } from '../../dto/like-status.dto';

class CommentatorInfo {
  userId: string;
  userLogin: string;
}

class LikesInfo {
  likesCount: number;
  dislikesCount: number;
  myStatus: 'Like' | 'Dislike' | 'None';
}

export class CommentViewDto {
  id: string;
  content: string;
  commentatorInfo: CommentatorInfo;
  createdAt: Date;
  likesInfo: LikesInfo;

  static mapToView(rawComment: RawSqlComment): CommentViewDto {
    const dto = new CommentViewDto();
    dto.id = rawComment.id;
    dto.content = rawComment.content;
    dto.createdAt = rawComment.createdAt;
    dto.commentatorInfo = {
      userId: rawComment.userId,
      userLogin: rawComment.userLogin,
    };
    dto.likesInfo = {
      likesCount: parseInt(String(rawComment.likesCount), 10) || 0,
      dislikesCount: parseInt(String(rawComment.dislikesCount), 10) || 0,
      myStatus: rawComment.myStatus || LikeStatuses.None,
    };
    return dto;
  }
}
