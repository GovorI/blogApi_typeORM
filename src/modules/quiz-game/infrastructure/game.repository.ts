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

  async setWinnerId(
    gameId: string,
    winnerId: string | null,
    manager?: EntityManager,
  ): Promise<GameEntity> {
    const repo = this.getRepo(manager);
    await repo.update(gameId, { winnerId });
    return repo.findOneOrFail({ where: { gameId } });
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

  async setLastAnsweredAt(
    gameId: string,
    timestamp: Date,
    deadline: Date,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(GameEntity) : this.repo;

    console.log(`[GAME] Setting deadline for game ${gameId}: deadline=${deadline.toISOString()}`);

    await repo.update(gameId, {
      lastAnsweredAt: timestamp,
      waitingForOpponentDeadline: deadline,
    });

    console.log(`[GAME] Deadline set successfully for game ${gameId}`);
  }

  async findExpiredGames(
    deadline: Date,
    manager?: EntityManager,
  ): Promise<GameEntity[]> {
    const repo = manager ? manager.getRepository(GameEntity) : this.repo;

    console.log(`[GAME] Finding expired games with deadline <= ${deadline.toISOString()}`);

    const result = await repo
      .createQueryBuilder('game')
      .where('game.status = :status', { status: gameStatuses.Active })
      .andWhere('game.waitingForOpponentDeadline <= :deadline', { deadline })
      .orderBy('game.waitingForOpponentDeadline', 'ASC')
      .take(100)
      .getMany();

    console.log(`[GAME] Found ${result.length} expired games`);
    if (result.length > 0) {
      result.forEach(g => {
        console.log(`[GAME]   - Game ${g.gameId}, deadline: ${g.waitingForOpponentDeadline?.toISOString()}`);
      });
    }

    return result;
  }

  async markAsFinished(
    gameId: string,
    winnerId: string | null,
    finishDate: Date,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(GameEntity) : this.repo;

    await repo.update(gameId, {
      status: gameStatuses.Finished,
      winnerId,
      finishGameDate: finishDate,
    });
  }
}
