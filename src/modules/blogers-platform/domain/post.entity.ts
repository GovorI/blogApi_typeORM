import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogEntity } from './blog.entity';
import { UpdatePostInputDto } from '../api/input-dto/post.input.dto';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { CommentEntity } from './comment.entity';

export interface NewestLikeInfo {
  login: string;
  userId: string;
  addedAt: Date;
}

@Entity('Posts')
export class PostEntity {
  @PrimaryColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 30 })
  title: string;
  @Column({ type: 'varchar', length: 100 })
  shortDescription: string;
  @Column({ type: 'varchar', length: 1000 })
  content: string;
  @Column({ type: 'uuid' })
  blogId: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => BlogEntity, (blog) => blog.posts)
  @JoinColumn({ name: 'blogId' })
  blog: BlogEntity;

  @OneToMany(() => CommentEntity, (comment) => comment.post)
  comments: CommentEntity[];

  update(dto: UpdatePostInputDto): void {
    this.title = dto.title ?? this.title;
    this.shortDescription = dto.shortDescription ?? this.shortDescription;
    this.content = dto.content ?? this.content;
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
