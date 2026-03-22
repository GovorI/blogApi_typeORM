import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PlayerEntity } from '../domain/player.entity';
import { AnswerEntity, answerStatuses } from '../domain/answer.entity';
import { GameRepository } from '../infrastructure/game.repository';
import { PlayerRepository } from '../infrastructure/player.repository';

export interface GameFinishResult {
  winnerId: string | null;
  player1Score: number;
  player2Score: number;
  bonusApplied: boolean;
  bonusRecipientId: string | null;
}

/**
 * Сервис для завершения игр с подсчётом очков и определением победителя
 */
@Injectable()
export class GameFinishService {
  private readonly logger = new Logger(GameFinishService.name);

  constructor(
    private readonly gameRepository: GameRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  /**
   * Завершает игру, подсчитывая очки и определяя победителя
   *
   * @param gameId - ID игры
   * @param player1 - первый игрок с ответами
   * @param player2 - второй игрок с ответами
   * @param totalQuestions - общее количество вопросов
   * @param manager - менеджер транзакции
   * @returns результат завершения игры
   */
  async finishGame(
    gameId: string,
    player1: PlayerEntity,
    player2: PlayerEntity,
    totalQuestions: number,
    manager: EntityManager,
  ): Promise<GameFinishResult> {
    // Проверяем, что оба игрока ответили на все вопросы
    const player1Finished = player1.answers.length >= totalQuestions;
    const player2Finished = player2.answers.length >= totalQuestions;

    if (!player1Finished || !player2Finished) {
      this.logger.warn(
        `Game ${gameId}: players haven't answered all questions (p1: ${player1.answers.length}/${totalQuestions}, p2: ${player2.answers.length}/${totalQuestions})`,
      );
      return {
        winnerId: null,
        player1Score: player1.score,
        player2Score: player2.score,
        bonusApplied: false,
        bonusRecipientId: null,
      };
    }

    // Подсчитываем правильные ответы
    const correctAnswers1 = this.countCorrectAnswers(player1.answers);
    const correctAnswers2 = this.countCorrectAnswers(player2.answers);

    // Начисляем бонус за скорость
    const bonusResult = await this.applySpeedBonus(
      player1,
      player2,
      correctAnswers1,
      correctAnswers2,
      manager,
    );

    // Определяем победителя
    const winnerId = this.determineWinner(player1, player2);

    // Обновляем игру
    await this.gameRepository.markAsFinished(
      gameId,
      winnerId,
      new Date(),
      manager,
    );

    this.logger.log(
      `Game ${gameId} finished: ${this.formatScore(player1, player2, winnerId)}`,
    );

    return {
      winnerId,
      player1Score: player1.score,
      player2Score: player2.score,
      bonusApplied: bonusResult.applied,
      bonusRecipientId: bonusResult.recipientId,
    };
  }

  /**
   * Подсчитывает количество правильных ответов
   */
  private countCorrectAnswers(answers: AnswerEntity[]): number {
    return answers.filter((a) => a.status === answerStatuses.Correct).length;
  }

  /**
   * Начисляет бонусный балл тому, кто ответил быстрее и имеет хотя бы 1 правильный ответ
   */
  private async applySpeedBonus(
    player1: PlayerEntity,
    player2: PlayerEntity,
    correctAnswers1: number,
    correctAnswers2: number,
    manager: EntityManager,
  ): Promise<{ applied: boolean; recipientId: string | null }> {
    // Бонус только если у кого-то есть правильные ответы
    if (correctAnswers1 === 0 && correctAnswers2 === 0) {
      return { applied: false, recipientId: null };
    }

    const lastAnswer1 = this.getLastAnswer(player1.answers);
    const lastAnswer2 = this.getLastAnswer(player2.answers);

    if (!lastAnswer1 || !lastAnswer2) {
      return { applied: false, recipientId: null };
    }

    // Определяем, кто закончил быстрее
    if (lastAnswer1.addedAt < lastAnswer2.addedAt && correctAnswers1 > 0) {
      await this.playerRepository.incrementScore(player1.id, 1);
      player1.score += 1;
      this.logger.debug(`Bonus point for player ${player1.id}`);
      return { applied: true, recipientId: player1.id };
    }

    if (lastAnswer2.addedAt < lastAnswer1.addedAt && correctAnswers2 > 0) {
      await this.playerRepository.incrementScore(player2.id, 1);
      player2.score += 1;
      this.logger.debug(`Bonus point for player ${player2.id}`);
      return { applied: true, recipientId: player2.id };
    }

    return { applied: false, recipientId: null };
  }

  /**
   * Определяет победителя по счёту
   */
  private determineWinner(
    player1: PlayerEntity,
    player2: PlayerEntity,
  ): string | null {
    if (player1.score > player2.score) {
      return player1.id;
    }
    if (player2.score > player1.score) {
      return player2.id;
    }
    return null; // ничья
  }

  /**
   * Возвращает последний ответ игрока
   */
  private getLastAnswer(answers: AnswerEntity[]): AnswerEntity | null {
    if (!answers.length) {
      return null;
    }
    return answers[answers.length - 1];
  }

  /**
   * Форматирует строку с результатом для логирования
   */
  private formatScore(
    player1: PlayerEntity,
    player2: PlayerEntity,
    winnerId: string | null,
  ): string {
    if (winnerId === null) {
      return `Draw (${player1.score}:${player2.score})`;
    }
    const winner = player1.id === winnerId ? player1 : player2;
    const loser = player1.id === winnerId ? player2 : player1;
    return `${winner.id} wins (${winner.score}:${loser.score})`;
  }
}
