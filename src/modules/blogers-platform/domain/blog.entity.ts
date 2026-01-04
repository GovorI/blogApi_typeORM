import { UpdateBlogDto } from '../dto/update-blog.dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostEntity } from './post.entity';

@Entity('Blogs')
export class BlogEntity {
  @PrimaryColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 15 })
  name: string;
  @Column({ type: 'varchar', length: 500 })
  description: string;
  @Column({ type: 'varchar', length: 100 })
  websiteUrl: string;
  @Column({ type: 'boolean', default: false })
  isMembership: boolean;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => PostEntity, (post) => post.blog)
  posts: PostEntity[];

  update(dto: UpdateBlogDto): void {
    this.name = dto.name ?? this.name;
    this.description = dto.description ?? this.description;
    this.websiteUrl = dto.websiteUrl ?? this.websiteUrl;
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
