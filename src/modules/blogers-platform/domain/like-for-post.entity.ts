import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostEntity } from './post.entity';
import { LikeStatuses } from '../dto/like-status.dto';

3;

@Entity('PostLikes')
export class LikeForPostEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  postId: string;

  @Column({ type: 'varchar' })
  status: LikeStatuses;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => PostEntity)
  @JoinColumn({ name: 'postId' })
  post: PostEntity;
}
