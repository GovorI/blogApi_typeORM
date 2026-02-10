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

    // return this.getRepo(manager).save(entity);

    // if (!entity.playerId) {
    //   console.error('PlayerId is null before save!');
    //   throw new Error('PlayerId cannot be null');
    // }
    //
    // // Сохраняем значение playerId
    // const playerId = entity.playerId;
    //
    // // Если используется manager
    // if (manager) {
    //   const savedEntity = await manager.save(entity);
    //
    //   // Если playerId был утерян после save, восстанавливаем его
    //   if (!savedEntity.playerId) {
    //     console.log('Restoring lost playerId:', playerId);
    //     savedEntity.playerId = playerId;
    //     await manager.save(savedEntity);
    //   }
    //
    //   return savedEntity;
    // }
    //
    // // Если manager не предоставлен
    // const savedEntity = await this.repo.save(entity);
    //
    // // Если playerId был утерян после save, восстанавливаем его
    // if (!savedEntity.playerId) {
    //   console.log('Restoring lost playerId:', playerId);
    //   savedEntity.playerId = playerId;
    //   await this.repo.save(savedEntity);
    // }
    //
    // return savedEntity;
  }
}
