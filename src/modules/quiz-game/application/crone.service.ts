import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { GameRepository } from '../infrastructure/game.repository';
import { GameEntity, gameStatuses } from '../domain/game.entity';
import { PlayerRepository } from '../infrastructure/player.repository';
import { AnswerRepository } from '../infrastructure/answer.repository';
import { AnswerEntity, answerStatuses } from '../domain/answer.entity';
import { DataSource } from 'typeorm';
import { GameFinishService } from './game-finish.service';
import { CronJob } from 'cron';

@Injectable()
export class GameTimeoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameTimeoutService.name);
  private readonly ANSWER_TIMEOUT_MS = 10_000; // 10 секунд
  private cronJob: CronJob | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly gameRepository: GameRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly gameFinishService: GameFinishService,
  ) {
    this.logger.log('[CRON SERVICE] Constructor called');
    console.log('[CRON SERVICE] Constructor called - service is being instantiated');
  }

  onModuleInit() {
    this.logger.log('[CRON SERVICE] onModuleInit - registering cron job');
    // Создаём и регистрируем cron job явно
    this.cronJob = new CronJob('* * * * * *', () => {
      this.handleGameTimeouts();
    });
    this.cronJob.start();
    this.logger.log('[CRON SERVICE] Cron job started successfully');
  }

  onModuleDestroy() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.logger.log('[CRON SERVICE] Cron job stopped');
    }
  }

  async handleGameTimeouts() {
    const now = new Date();
    try {
      // Ищем игры, у которых waitingForOpponentDeadline <= сейчас
      // Это означает, что 10-секундный таймаут уже истёк
      const expiredGames = await this.gameRepository.findExpiredGames(now);

      this.logger.log(`[CRON] Found ${expiredGames.length} expired games`);

      if (expiredGames.length === 0) {
        return;
      }

      this.logger.log(`[CRON] Processing ${expiredGames.length} expired games`);

      for (const game of expiredGames) {
        await this.finishGameByTimeout(game);
      }
    } catch (error) {
      this.logger.error('Error in handleGameTimeouts:', error);
    }
  }

  private async finishGameByTimeout(game: GameEntity): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Блокируем игру для обновления
      const lockedGame = await this.gameRepository.lockGameForUpdate(
        game.gameId,
        queryRunner.manager,
      );

      if (!lockedGame) {
        this.logger.warn(`Game ${game.gameId} not found, skipping`);
        return;
      }

      // Проверяем, не завершена ли игра уже
      if (lockedGame.status === gameStatuses.Finished) {
        this.logger.debug(`Game ${game.gameId} already finished, skipping`);
        return;
      }

      // Проверяем, не истёк ли дедлайн всё ещё
      if (
        !lockedGame.waitingForOpponentDeadline ||
        lockedGame.waitingForOpponentDeadline > new Date()
      ) {
        this.logger.debug(`Game ${game.gameId} deadline not expired yet`);
        return;
      }

      this.logger.log(`Finishing game ${game.gameId} by timeout`);

      // Находим игроков
      const players = await this.playerRepository.findByGameId(
        game.gameId,
        queryRunner.manager,
      );

      if (players.length !== 2) {
        this.logger.error(
          `Game ${game.gameId} has ${players.length} players, expected 2`,
        );
        return;
      }

      const player1 = players[0];
      const player2 = players[1];
      const totalQuestions = lockedGame.questions.length;

      // Определяем, кто закончил первым (ответил на все вопросы)
      const player1AnswersCount = player1.answers?.length ?? 0;
      const player2AnswersCount = player2.answers?.length ?? 0;

      let finishedPlayer: typeof player1 | null = null;
      let waitingPlayer: typeof player1 | null = null;

      if (player1AnswersCount >= totalQuestions) {
        finishedPlayer = player1;
        waitingPlayer = player2;
      } else if (player2AnswersCount >= totalQuestions) {
        finishedPlayer = player2;
        waitingPlayer = player1;
      }

      if (!finishedPlayer || !waitingPlayer) {
        this.logger.error(
          `Game ${game.gameId}: could not determine finished player`,
        );
        return;
      }

      // Создаём фиктивные неверные ответы для всех неотвеченных вопросов
      const unansweredQuestionIds = lockedGame.questions
        .filter(
          (gq) =>
            !waitingPlayer.answers?.some((a) => a.questionId === gq.questionId),
        )
        .map((gq) => gq.questionId);

      if (unansweredQuestionIds.length > 0) {
        this.logger.log(
          `Creating ${unansweredQuestionIds.length} fake answers for player ${waitingPlayer.id}`,
        );

        const fakeAnswers: AnswerEntity[] = unansweredQuestionIds.map(
          (questionId) =>
            this.answerRepository.createEntity({
              playerId: waitingPlayer.id,
              questionId,
              body: '', // пустой ответ
              status: answerStatuses.Incorrect, // все неверные
              addedAt: new Date(), // время истечения
            }),
        );

        await this.answerRepository.saveMany(fakeAnswers, queryRunner.manager);

        // Добавляем фиктивные ответы в массив ответов игрока для последующей обработки
        if (!waitingPlayer.answers) {
          waitingPlayer.answers = [];
        }
        waitingPlayer.answers.push(...fakeAnswers);
      }

      // Завершаем игру через сервис (теперь оба игрока имеют все ответы)
      await this.gameFinishService.finishGame(
        game.gameId,
        player1,
        player2,
        totalQuestions,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Game ${game.gameId} finished successfully`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error finishing game ${game.gameId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
