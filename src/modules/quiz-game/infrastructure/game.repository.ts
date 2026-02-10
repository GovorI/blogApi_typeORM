import { InjectRepository } from '@nestjs/typeorm';
import { GameEntity, gameStatuses } from '../domain/game.entity';
import { EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

export class GameRepository {
  constructor(
    @InjectRepository(GameEntity)
    private readonly repo: Repository<GameEntity>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<GameEntity> {
    return manager ? manager.getRepository(GameEntity) : this.repo;
  }

  createEntity(data: Partial<GameEntity>): GameEntity {
    return this.repo.create({
      ...data,
      gameId: data.gameId ?? randomUUID(),
      pairCreatedDate: new Date(),
      startGameDate: null,
      finishGameDate: null,
    });
  }

  save(entity: GameEntity, manager?: EntityManager): Promise<GameEntity> {
    return this.getRepo(manager).save(entity);
  }

  async findGameWithPendingSecondPlayerForUpdate(
    manager?: EntityManager,
  ): Promise<GameEntity | null> {
    const repo = this.getRepo(manager);

    return repo
      .createQueryBuilder('g')
      .setLock('pessimistic_write') // FOR UPDATE
      .where('g.status = :status', {
        status: gameStatuses.PendingSecondPlayer,
      })
      .getOne();
  }

  findGameWithPendingSecondPlayer(
    manager?: EntityManager,
  ): Promise<GameEntity | null> {
    return this.getRepo(manager).findOne({
      where: {
        status: gameStatuses.PendingSecondPlayer,
      },
    });
  }

  findUnfinishedByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<GameEntity | null> {
    return this.getRepo(manager)
      .createQueryBuilder('g')
      .innerJoin('g.players', 'p')
      .where('p.userId = :userId', { userId })
      .andWhere('g.status IN (:...statuses)', {
        statuses: [gameStatuses.PendingSecondPlayer, gameStatuses.Active],
      })
      .getOne();
  }

  async findActiveGameByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<GameEntity | null> {
    const repo = this.getRepo(manager);

    // Сначала находим и блокируем только игру
    const gameWithLock = await repo
      .createQueryBuilder('g')
      .innerJoin('g.players', 'filterPlayer')
      .where('filterPlayer.userId = :userId', { userId })
      .andWhere('g.status = :status', {
        status: gameStatuses.Active,
      })
      .setLock('pessimistic_write')
      .getOne();

    if (!gameWithLock) {
      return null;
    }

    // Теперь загружаем все связанные данные
    return repo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.players', 'p')
      .leftJoinAndSelect('p.user', 'playerUser')
      .leftJoinAndSelect(
        'p.answers',
        'playerAnswers',
        'playerAnswers.playerId = p.id',
      )
      .leftJoinAndSelect('g.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .where('g.gameId = :gameId', { gameId: gameWithLock.gameId })
      .orderBy('questions.index', 'ASC')
      .addOrderBy('playerAnswers.addedAt', 'ASC')
      .getOne();
  }

  async lockGameForUpdate(
    gameId: string,
    manager?: EntityManager,
  ): Promise<GameEntity | null> {
    const repo = this.getRepo(manager);

    // Сначала блокируем саму игру
    const lockedGame = await repo
      .createQueryBuilder('game')
      .where('game.gameId = :gameId', { gameId })
      .setLock('pessimistic_write')
      .getOne();

    if (!lockedGame) {
      return null;
    }

    // Загружаем все связанные данные после блокировки
    return repo
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.players', 'players')
      .leftJoinAndSelect('players.answers', 'answers')
      .leftJoinAndSelect('game.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .where('game.gameId = :gameId', { gameId })
      .orderBy('questions.index', 'ASC')
      .addOrderBy('answers.addedAt', 'ASC')
      .getOne();
  }
}
