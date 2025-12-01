import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from './comment-entity';
import { LikeStatuses } from '../dto/like-status.dto';

@Entity('CommentLikes')
export class LikeForCommentEntity {
  @PrimaryColumn('uuid')
  commentId: string;
  @PrimaryColumn('uuid')
  userId: string;
  @Column({ type: 'varchar' })
  status: LikeStatuses;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CommentEntity)
  @JoinColumn({ name: 'commentId' })
  comment: CommentEntity;
}
