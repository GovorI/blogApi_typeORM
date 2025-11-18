import { UpdateBlogDto } from '../dto/update-blog.dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

export class BlogEntity {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  isMembership: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(data: Partial<BlogEntity> = {}) {
    Object.assign(this, data);

    this.isMembership = this.isMembership ?? false;
    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
    this.deletedAt = this.deletedAt ?? null;
  }

  update(dto: UpdateBlogDto): void {
    this.name = dto.name ?? this.name;
    this.description = dto.description ?? this.description;
    this.websiteUrl = dto.websiteUrl ?? this.websiteUrl;
    this.updatedAt = new Date();
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
