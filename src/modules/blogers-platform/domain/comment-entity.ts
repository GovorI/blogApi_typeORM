import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

export class CommentEntity {
  id: string;
  content: string;
  postId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(data: Partial<CommentEntity> = {}) {
    Object.assign(this, data);
    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
    this.deletedAt = this.deletedAt ?? null;
  }

  makeDeleted(): void {
    if (this.deletedAt !== null) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Entity already deleted',
      });
    }
    this.deletedAt = new Date();
  }
}
