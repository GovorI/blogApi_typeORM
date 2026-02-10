import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { QuestionEntity } from '../domain/question.entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Injectable()
export class QuestionsRepository {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly repo: Repository<QuestionEntity>,
  ) {}

  createEntity(data: Partial<QuestionEntity>): QuestionEntity {
    return this.repo.create({
      ...data,
      id: data.id ?? randomUUID(),
      deletedAt: null,
      updatedAt: null,
    });
  }

  async save(entity: QuestionEntity): Promise<QuestionEntity> {
    return this.repo.save(entity);
  }

  async deleteByIdOrNotFoundFail(id: string): Promise<void> {
    const entity = await this.findByIdOrNotFoundFail(id);
    entity.makeDeleted();
    await this.save(entity);
  }

  async findByIdOrNotFoundFail(id: string): Promise<QuestionEntity> {
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
