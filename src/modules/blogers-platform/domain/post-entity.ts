import { UpdatePostInputDto } from '../api/input-dto/post.input.dto';

export interface NewestLikeInfo {
  login: string;
  userId: string;
  addedAt: Date;
}

export class PostEntity {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(data: Partial<PostEntity> = {}) {
    Object.assign(this, data);

    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
    this.deletedAt = this.deletedAt ?? null;
  }

  update(dto: UpdatePostInputDto): void {
    this.title = dto.title ?? this.title;
    this.shortDescription = dto.shortDescription ?? this.shortDescription;
    this.content = dto.content ?? this.content;
    this.updatedAt = new Date();
  }

  makeDeleted() {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
  }
}
