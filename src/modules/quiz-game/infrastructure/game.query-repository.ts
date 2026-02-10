import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GameEntity, gameStatuses } from '../domain/game.entity';
import { GameViewDto } from '../api/view-dto/game.view-dto';
import { Injectable } from '@nestjs/common';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Injectable()
export class GameQueryRepository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

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
