import { GameRepository } from '../../infrastructure/game.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { AnswerRepository } from '../../infrastructure/answer.repository';
import { PlayerRepository } from '../../infrastructure/player.repository';
import { answerStatuses } from '../../domain/answer.entity';
import { gameStatuses } from '../../domain/game.entity';
import { AnswerViewDto } from '../../api/view-dto/answer.view-dto';
import { DataSource, EntityManager } from 'typeorm';

export class SetAnswerCommand {
  constructor(
    public userId: string,
    public answer: string,
  ) {}
}

@CommandHandler(SetAnswerCommand)
export class SetAnswerUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameRepository: GameRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly answerRepository: AnswerRepository,
  ) {}

  async execute(command: SetAnswerCommand): Promise<AnswerViewDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const game = await this.gameRepository.findActiveGameByUserId(
          command.userId,
          manager,
        );

        if (!game) {
          throw new DomainException({
            code: DomainExceptionCode.Forbidden,
            message: 'User does not have an active game',
          });
        }

        if (game.status !== gameStatuses.Active) {
          throw new DomainException({
            code: DomainExceptionCode.Forbidden,
            message: 'Game is not in Active status',
          });
        }

        const player = game.players.find((p) => p.userId === command.userId);
        if (!player) {
          throw new DomainException({
            code: DomainExceptionCode.Forbidden,
            message: 'User does not have an active game',
          });
        }

        const playerAnswers = (player.answers ?? []).sort(
          (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
        );
        const totalQuestions = game.questions.length;

        if (playerAnswers.length >= totalQuestions) {
          // Player already answered all questions
          throw new DomainException({
            code: DomainExceptionCode.Forbidden,
            message: 'No questions left to answer',
          });
        }

        const currentQuestion = game.questions[playerAnswers.length];

        if (!currentQuestion) {
          throw new DomainException({
            code: DomainExceptionCode.Forbidden,
            message: 'No current question to answer',
          });
        }

        // Проверка, что question и correctAnswers существуют
        if (
          !currentQuestion.question ||
          !Array.isArray(currentQuestion.question.correctAnswers)
        ) {
          console.error('Invalid question structure:', currentQuestion);
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'Invalid question structure',
          });
        }

        // Check correctness (trim + case-insensitive)
        const normalize = (s: string) => s.trim().toLowerCase();
        const provided = normalize(command.answer);
        const isCorrect = (currentQuestion.question.correctAnswers || []).some(
          (ans) => normalize(ans) === provided,
        );

        if (!player.id || !player.id) {
          throw new DomainException({
            code: DomainExceptionCode.InternalServerError,
            message: 'Invalid player ID',
          });
        }

        // Persist answer
        const answerEntity = this.answerRepository.createEntity({
          playerId: player.id,
          questionId: currentQuestion.questionId,
          body: command.answer,
          status: isCorrect ? answerStatuses.Correct : answerStatuses.Incorrect,
        });

        const savedAnswer = await this.answerRepository.save(
          answerEntity,
          manager,
        );
        console.log('currentQuestion', currentQuestion);
        console.log('savedAnswer', savedAnswer);
        // Update player's score if correct
        if (isCorrect) {
          const newScore = (player.score ?? 0) + 1;
          await this.playerRepository.updateScore(player.id, newScore, manager);
          player.score = newScore; // Обновляем локальный объект для последующей логики
        }

        // Проверяем, ответили ли все игроки на все вопросы
        // Учитываем только что сохраненный ответ
        const answersCount = new Map<string, number>();
        for (const p of game.players) {
          const count = (p.answers?.length || 0) + (p.id === player.id ? 1 : 0);
          answersCount.set(p.id, count);
        }

        const allAnswered = Array.from(answersCount.values()).every(
          (count) => count >= totalQuestions,
        );

        if (allAnswered) {
          // Явно блокируем игру для обновления
          const lockedGame = await this.gameRepository.lockGameForUpdate(
            game.gameId,
            manager,
          );

          if (!lockedGame) {
            throw new DomainException({
              code: DomainExceptionCode.Conflict,
              message: 'Не удалось заблокировать игру для обновления',
            });
          }

          // Проверяем статус повторно после блокировки
          if (lockedGame.status === gameStatuses.Finished) {
            // Игра уже завершена, просто возвращаем результат
            return AnswerViewDto.mapToView(savedAnswer);
          }

          // Перепроверяем, действительно ли все ответили после блокировки
          const player1 = lockedGame.players[0];
          const player2 = lockedGame.players[1];

          // Убедимся, что у обоих игроков действительно есть все ответы
          if (
            player1.answers.length < totalQuestions ||
            player2.answers.length < totalQuestions
          ) {
            // Еще не все ответы сохранены, не завершаем игру
            return AnswerViewDto.mapToView(savedAnswer);
          }

          // Подсчитываем правильные ответы
          const correctAnswers1 = player1.answers.filter(
            (a) => a.status === answerStatuses.Correct,
          ).length;
          const correctAnswers2 = player2.answers.filter(
            (a) => a.status === answerStatuses.Correct,
          ).length;

          // Начисляем бонусные очки согласно правилам:
          // +1 балл тому, кто ответил на все вопросы быстрее И имеет хотя бы 1 правильный ответ
          if (correctAnswers1 > 0 || correctAnswers2 > 0) {
            // Определяем, кто закончил первым (по времени последнего ответа)
            const lastAnswer1 = player1.answers.sort(
              (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
            )[0];
            const lastAnswer2 = player2.answers.sort(
              (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
            )[0];

            if (lastAnswer1 && lastAnswer2) {
              if (
                lastAnswer1.addedAt < lastAnswer2.addedAt &&
                correctAnswers1 > 0
              ) {
                // Игрок 1 ответил быстрее и имеет хотя бы 1 правильный ответ
                const bonusScore = (player1.score || 0) + 1;
                await this.playerRepository.updateScore(
                  player1.id,
                  bonusScore,
                  manager,
                );
                player1.score = bonusScore;
              } else if (
                lastAnswer2.addedAt < lastAnswer1.addedAt &&
                correctAnswers2 > 0
              ) {
                // Игрок 2 ответил быстрее и имеет хотя бы 1 правильный ответ
                const bonusScore = (player2.score || 0) + 1;
                await this.playerRepository.updateScore(
                  player2.id,
                  bonusScore,
                  manager,
                );
                player2.score = bonusScore;
              }
              if (player1.score === player2.score) {
                await this.gameRepository.setWinnerId(
                  game.gameId,
                  null,
                  manager,
                );
              }
            }
          }

          if (player1.score > player2.score) {
            await this.gameRepository.setWinnerId(
              game.gameId,
              player1.id,
              manager,
            );
          } else if (player2.score > player1.score) {
            await this.gameRepository.setWinnerId(
              game.gameId,
              player2.id,
              manager,
            );
          } else {
            await this.gameRepository.setWinnerId(game.gameId, null, manager);
          }

          // Mark game finished
          lockedGame.status = gameStatuses.Finished;
          lockedGame.finishGameDate = new Date();

          await this.gameRepository.save(lockedGame, manager);
        }
        return AnswerViewDto.mapToView(savedAnswer);
      });
    } catch (error) {
      throw error;
    }
  }
}
