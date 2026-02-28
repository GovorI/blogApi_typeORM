import { CommandHandler } from '@nestjs/cqrs';
import { GameRepository } from '../../infrastructure/game.repository';
import { PlayerRepository } from '../../infrastructure/player.repository';
import { gameStatuses } from '../../domain/game.entity';
import { randomUUID } from 'crypto';
import { GameQuestionsRepository } from '../../infrastructure/game-questions.repository';
import { QuestionsQueryRepository } from '../../infrastructure/questions.query-repository';
import { positionNumber } from '../../domain/player.entity';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { DataSource } from 'typeorm';
import { GameViewDto } from '../../api/view-dto/game.view-dto';
import { GameQueryRepository } from '../../infrastructure/game.query-repository';
import { GameQuestionEntity } from '../../domain/game-question.entity';

export class ConnectionGameCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(ConnectionGameCommand)
export class ConnectionGameUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly dataSource: DataSource,
    private readonly questionsQueryRepository: QuestionsQueryRepository,
    private readonly gameQueryRepository: GameQueryRepository,
  ) {}

  async execute(command: ConnectionGameCommand): Promise<GameViewDto> {
    const unfinishedGame = await this.gameRepository.findUnfinishedByUserId(
      command.userId,
    );
    if (unfinishedGame) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'User already has an unfinished game',
      });
    }

    await this.dataSource.transaction(async (manager) => {
      const game =
        await this.gameRepository.findGameWithPendingSecondPlayerForUpdate(
          manager,
        );

      if (game) {
        const player = this.playerRepository.createEntity({
          userId: command.userId,
          gameId: game.gameId,
          position: positionNumber.Second,
        });

        await this.playerRepository.save(player, manager);

        const questionsIds =
          await this.questionsQueryRepository.findRandomPublishedIds(5);

        // await this.gameQuestionsRepository.createGameQuestions(
        //   game.gameId,
        //   questionsIds,
        //   manager,
        // );

        const gameQuestions = questionsIds.map((q, index) => {
          const gameQuestion = new GameQuestionEntity();
          gameQuestion.question = q; // q - это объект QuestionEntity
          gameQuestion.index = index;
          return gameQuestion;
        });

        game.questions = gameQuestions;

        // const gameQuestions = questionsIds.map((q, index) => {
        //   const gameQuestion = new GameQuestionEntity();
        //   gameQuestion.gameId = game.gameId;
        //   gameQuestion.questionId = q;
        //   gameQuestion.index = index + 1; // Устанавливаем порядковый индекс
        //   return gameQuestion;
        // });
        // await this.gameQuestionsRepository.save(gameQuestions, manager);
        console.log('gameQuestions', gameQuestions);

        game.status = gameStatuses.Active;
        game.pairCreatedDate = new Date();
        game.startGameDate = new Date();

        await this.gameRepository.save(game, manager);
      } else {
        const gameId = randomUUID();
        const game = this.gameRepository.createEntity({
          gameId,
          status: gameStatuses.PendingSecondPlayer,
        });
        await this.gameRepository.save(game, manager);

        const player = this.playerRepository.createEntity({
          userId: command.userId,
          gameId,
          position: positionNumber.First,
        });
        await this.playerRepository.save(player, manager);
      }
    });
    return this.gameQueryRepository.getCurrentUnfinishedGame(command.userId);
  }
}
