import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GameEntity, gameStatuses } from '../domain/game.entity';
import { GameViewDto } from '../api/view-dto/game.view-dto';
import { Injectable } from '@nestjs/common';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import {
  GamesSortBy,
  GetAllUserGamesGetQueryParams,
} from '../api/input-dto/get-all-user-games.get-query-params';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { UserStatisticViewDto } from '../api/view-dto/user-statustic.view-dto';

@Injectable()
export class GameQueryRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getAllUserGames(
    userId: string,
    queryParams?: GetAllUserGamesGetQueryParams,
  ): Promise<PaginatedViewDto<GameViewDto[]>> {
    const repo = this.dataSource.getRepository(GameEntity);

    const baseQB = repo
      .createQueryBuilder('g')
      .innerJoin('g.players', 'filterPlayer', 'filterPlayer.userId = :userId', {
        userId,
      });

    const totalRaw = await baseQB
      .clone()
      .select('COUNT(DISTINCT g.gameId)', 'cnt')
      .getRawOne<{ cnt: string | number }>();
    const totalCount = Number(totalRaw?.cnt ?? 0);

    const sortByField =
      queryParams?.sortBy === GamesSortBy.status
        ? 'g.status'
        : 'g.pairCreatedDate';
    const sortDir =
      queryParams?.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    const idsQB = baseQB
      .clone()
      .select('g.gameId', 'gameId')
      .orderBy(sortByField, sortDir);

    if (queryParams?.sortBy === GamesSortBy.status) {
      idsQB.addOrderBy('g.pairCreatedDate', 'DESC');
    }

    const idsRows = await idsQB
      .skip(queryParams?.calculateSkip?.() ?? 0)
      .take(queryParams?.pageSize ?? 10)
      .getRawMany<{ gameId: string }>();

    const gameIds = [...new Set(idsRows.map((r) => r.gameId))];

    if (gameIds.length === 0) {
      return PaginatedViewDto.mapToView({
        pageNumber: queryParams?.pageNumber ?? 1,
        pageSize: queryParams?.pageSize ?? 10,
        totalCount,
        items: [],
      });
    }

    const gamesQB = repo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.players', 'p')
      .leftJoinAndSelect('p.user', 'playerUser')
      .leftJoinAndSelect('p.answers', 'playerAnswers')
      .leftJoinAndSelect('g.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .where('g.gameId IN (:...ids)', { ids: gameIds })
      .orderBy(sortByField, sortDir);

    if (queryParams?.sortBy === GamesSortBy.status) {
      gamesQB.addOrderBy('g.pairCreatedDate', 'DESC');
    }

    const games = await gamesQB.getMany();
    const items = games.map((g) => GameViewDto.mapToView(g));

    return PaginatedViewDto.mapToView({
      pageNumber: queryParams?.pageNumber ?? 1,
      pageSize: queryParams?.pageSize ?? 10,
      totalCount,
      items,
    });
  }

  async getUserStatistic(userId: string): Promise<UserStatisticViewDto> {
    const repo = this.dataSource.getRepository(GameEntity);

    const baseQB = repo
      .createQueryBuilder('g')
      .innerJoin('g.players', 'filterPlayer', 'filterPlayer.userId = :userId', {
        userId,
      })
      .leftJoin('g.players', 'opponent', 'opponent.userId != :userId', {
        userId,
      });

    const gamesCountRaw = await baseQB
      .clone()
      .select('COUNT(DISTINCT g.gameId)', 'cnt')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .getRawOne<{ cnt: string | number }>();
    const gamesCount = Number(gamesCountRaw?.cnt ?? 0);

    const winsCountRaw = await baseQB
      .clone()
      .select('COUNT(DISTINCT g.gameId)', 'cnt')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .andWhere('filterPlayer.score > opponent.score')
      .getRawOne<{ cnt: string | number }>();
    const winsCount = Number(winsCountRaw?.cnt ?? 0);

    const lossesCountRaw = await baseQB
      .clone()
      .select('COUNT(DISTINCT g.gameId)', 'cnt')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .andWhere('filterPlayer.score < opponent.score')
      .getRawOne<{ cnt: string | number }>();
    const lossesCount = Number(lossesCountRaw?.cnt ?? 0);

    const drawsCountRaw = await baseQB
      .clone()
      .select('COUNT(DISTINCT g.gameId)', 'cnt')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .andWhere('filterPlayer.score = opponent.score')
      .getRawOne<{ cnt: string | number }>();
    const drawsCount = Number(drawsCountRaw?.cnt ?? 0);

    // const gamesCount =
    //   Number(winsCount?.cnt ?? 0) +
    //   Number(lossesCount?.cnt ?? 0) +
    //   Number(drawCount?.cnt ?? 0);

    const sumScoreRaw = await baseQB
      .clone()
      .select('SUM(filterPlayer.score)', 'sum')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .getRawOne<{ sum: string | number }>();
    const sumScore = Number(sumScoreRaw?.sum ?? 0);

    const avgScoresRaw = await baseQB
      .clone()
      .select('AVG(filterPlayer.score)', 'avg')
      .where('g.status = :status', { status: gameStatuses.Finished })
      .getRawOne<{ avg: string | number }>();
    const avgScores = Math.round(Number(avgScoresRaw?.avg ?? 0) * 100) / 100;

    return {
      sumScore,
      avgScores,
      gamesCount,
      winsCount,
      lossesCount,
      drawsCount,
    };
  }

  async getCurrentUnfinishedGame(userId: string): Promise<GameViewDto> {
    const game = await this.dataSource
      .getRepository(GameEntity)
      .createQueryBuilder('g')
      .innerJoin('g.players', 'filterPlayer', 'filterPlayer.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('g.players', 'p')
      .leftJoinAndSelect('p.user', 'playerUser')
      .leftJoinAndSelect('p.answers', 'playerAnswers')
      .leftJoinAndSelect('g.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .andWhere('g.status IN (:...statuses)', {
        statuses: [gameStatuses.PendingSecondPlayer, gameStatuses.Active],
      })
      .getOne();

    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Game not found',
      });
    }

    return GameViewDto.mapToView(game);
  }

  async getGameById(gameId: string, userId: string): Promise<GameViewDto> {
    const game = await this.dataSource
      .getRepository(GameEntity)
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.players', 'p')
      .leftJoinAndSelect('p.user', 'playerUser')
      .leftJoinAndSelect('p.answers', 'playerAnswers')
      .leftJoinAndSelect('g.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .where('g.gameId = :gameId', { gameId })
      .orderBy('questions.index', 'ASC')
      .getOne();

    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Game not found',
      });
    }

    if (game.players.some((p) => p.userId === userId)) {
      return GameViewDto.mapToView(game);
    }

    throw new DomainException({
      code: DomainExceptionCode.Forbidden,
      message: 'User is not a player in this game',
    });
  }
}
