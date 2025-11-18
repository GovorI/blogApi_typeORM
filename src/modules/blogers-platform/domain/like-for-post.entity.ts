export class LikeForPostEntity {
  userId: string;
  status: string;
  postId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<LikeForPostEntity> = {}) {
    Object.assign(this, data);

    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }
}
