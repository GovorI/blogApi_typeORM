import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AnswerEntity, answerStatuses } from '../domain/answer.entity';
import { randomUUID } from 'crypto';

export class AnswerRepository {
  constructor(
    @InjectRepository(AnswerEntity)
    private readonly repo: Repository<AnswerEntity>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<AnswerEntity> {
    return manager ? manager.getRepository(AnswerEntity) : this.repo;
  }

  createEntity(data: Partial<AnswerEntity>): AnswerEntity {
    return this.repo.create({
      ...data,
      id: data.id ?? randomUUID(),
      status: data.status ?? answerStatuses.Incorrect,
      addedAt: data.addedAt ?? new Date(),
    });
  }

  async save(
    entity: AnswerEntity,
    manager?: EntityManager,
  ): Promise<AnswerEntity> {
    return manager ? manager.save(entity) : this.repo.save(entity);
  }

  async saveMany(
    entities: AnswerEntity[],
    manager?: EntityManager,
  ): Promise<AnswerEntity[]> {
    return manager ? manager.save(entities) : this.repo.save(entities);
  }

  async countByPlayerId(
    playerId: string,
    manager?: EntityManager,
  ): Promise<number> {
    return this.getRepo(manager).count({ where: { playerId } });
  }

  async findByPlayerId(
    playerId: string,
    manager?: EntityManager,
  ): Promise<AnswerEntity[]> {
    return this.getRepo(manager)
      .createQueryBuilder('answer')
      .where('answer.playerId = :playerId', { playerId })
      .orderBy('answer.addedAt', 'ASC')
      .getMany();
  }
}
