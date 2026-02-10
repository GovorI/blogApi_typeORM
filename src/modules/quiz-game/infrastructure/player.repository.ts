import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PlayerEntity } from '../domain/player.entity';
import { randomUUID } from 'crypto';

export class PlayerRepository {
  constructor(
    @InjectRepository(PlayerEntity)
    private readonly repo: Repository<PlayerEntity>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<PlayerEntity> {
    return manager ? manager.getRepository(PlayerEntity) : this.repo;
  }

  createEntity(data: Partial<PlayerEntity>): PlayerEntity {
    return this.repo.create({
      ...data,
      id: data.id ?? randomUUID(),
    });
  }

  save(entity: PlayerEntity, manager?: EntityManager): Promise<PlayerEntity> {
    return this.getRepo(manager).save(entity);
  }

  async updateScore(
    playerId: string,
    score: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getRepo(manager)
      .createQueryBuilder()
      .update(PlayerEntity)
      .set({ score })
      .where('id = :id', { id: playerId })
      .execute();
  }
}
