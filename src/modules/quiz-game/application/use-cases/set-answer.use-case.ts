import { GameRepository } from '../../infrastructure/game.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { AnswerRepository } from '../../infrastructure/answer.repository';
import { PlayerRepository } from '../../infrastructure/player.repository';
import { answerStatuses } from '../../domain/answer.entity';
import { gameStatuses, GameEntity } from '../../domain/game.entity';
import { AnswerViewDto } from '../../api/view-dto/answer.view-dto';
import { DataSource, EntityManager } from 'typeorm';
import { GameFinishService } from '../game-finish.service';

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
    private readonly gameFinishService: GameFinishService,
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

        // После ответа на вопрос проверяем ситуацию:
        // 1. Если оба ответили на все вопросы → завершаем игру
        // 2. Если этот игрок ответил на все, но соперник ещё нет → устанавливаем дедлайн

        const currentAnswersCount =
          (player.answers?.length ?? 0) + 1; // +1 так как ответ уже сохранён
        const opponent = game.players.find((p) => p.userId !== command.userId);
        const opponentAnswersCount = opponent?.answers?.length ?? 0;

        const currentPlayerFinished = currentAnswersCount >= totalQuestions;
        const opponentFinished = opponentAnswersCount >= totalQuestions;

        if (currentPlayerFinished && opponentFinished) {
          // Оба игрока ответили на все вопросы → завершаем игру сразу
          // Блокируем игру для обновления
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

          const player1 = lockedGame.players[0];
          const player2 = lockedGame.players[1];

          await this.gameFinishService.finishGame(
            game.gameId,
            player1,
            player2,
            totalQuestions,
            manager,
          );
        } else if (currentPlayerFinished && !opponentFinished) {
          // Этот игрок закончил, но соперник ещё нет → устанавливаем дедлайн
          const now = new Date();
          const deadline = new Date(now.getTime() + 10_000); // 10 секунд

          await this.gameRepository.setLastAnsweredAt(
            game.gameId,
            now,
            deadline,
            manager,
          );
        }

        return AnswerViewDto.mapToView(savedAnswer);
      });
    } catch (error) {
      throw error;
    }
  }
}
