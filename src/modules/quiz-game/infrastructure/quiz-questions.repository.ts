import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { QuizQuestionEntity } from '../domain/quiz-question.entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Injectable()
export class QuizQuestionsRepository {
  constructor(
    @InjectRepository(QuizQuestionEntity)
    private readonly repo: Repository<QuizQuestionEntity>,
  ) {}

  createEntity(data: Partial<QuizQuestionEntity>): QuizQuestionEntity {
    return this.repo.create({
      ...data,
      id: data.id ?? randomUUID(),
      deletedAt: null,
      updatedAt: null,
    });
  }

  async save(entity: QuizQuestionEntity): Promise<QuizQuestionEntity> {
    return this.repo.save(entity);
  }

  async deleteByIdOrNotFoundFail(id: string): Promise<void> {
    const entity = await this.findByIdOrNotFoundFail(id);
    entity.makeDeleted();
    await this.save(entity);
  }

  async findByIdOrNotFoundFail(id: string): Promise<QuizQuestionEntity> {
    const entity = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found',
      });
    }

    return entity;
  }
}
