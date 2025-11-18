export class LikeForCommentEntity {
  commentId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<LikeForCommentEntity> = {}) {
    Object.assign(this, data);

    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }
}
