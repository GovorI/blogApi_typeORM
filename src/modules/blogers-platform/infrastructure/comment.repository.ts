import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntity } from '../domain/comment-entity';
import { CommentNotFoundException } from '../../../core/domain/domain.exception';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  create(comment: Partial<CommentEntity>): CommentEntity {
    return this.commentRepository.create({
      ...comment,
      id: comment.id || randomUUID(),
    });
  }

  async save(comment: CommentEntity): Promise<CommentEntity> {
    return this.commentRepository.save(comment);
  }

  async findByIdOrNotFoundFail(id: string): Promise<CommentEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!comment) {
      throw new CommentNotFoundException('Comment not found');
    }
    return comment;
  }
}
