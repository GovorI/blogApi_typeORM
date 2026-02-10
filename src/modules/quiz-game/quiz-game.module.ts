import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaQuizQuestionsController } from './api/sa/sa-quiz-questions.controller';
import { CreateQuizQuestionUseCase } from './application/use-cases/questionsCrud/create-quiz-question.use-case';
import { DeleteQuizQuestionUseCase } from './application/use-cases/questionsCrud/delete-quiz-question.use-case';
import { SetPublishStatusQuizQuestionUseCase } from './application/use-cases/questionsCrud/set-publish-status-quiz-question.use-case';
import { UpdateQuizQuestionUseCase } from './application/use-cases/questionsCrud/update-quiz-question.use-case';
import { QuestionEntity } from './domain/question.entity';
import { QuestionsRepository } from './infrastructure/questions.repository';
import { QuestionsQueryRepository } from './infrastructure/questions.query-repository';
import { CqrsModule } from '@nestjs/cqrs';
import { ConnectionGameUseCase } from './application/use-cases/connection-game.use-case';
import { QuizGameController } from './api/quiz-game.controller';
import { GameRepository } from './infrastructure/game.repository';
import { GameQuestionsRepository } from './infrastructure/game-questions.repository';
import { PlayerRepository } from './infrastructure/player.repository';
import { GameQuestionEntity } from './domain/game-question.entity';
import { GameEntity } from './domain/game.entity';
import { PlayerEntity } from './domain/player.entity';
import { AnswerEntity } from './domain/answer.entity';
import { GameQueryRepository } from './infrastructure/game.query-repository';
import { GetCurrentUserUnfinishedGame } from './application/use-cases/get-current-user-unfinished-game.use-case';
import { GetGameByIdUseCase } from './application/use-cases/get-game-by-id.use-case';
import { SetAnswerUseCase } from './application/use-cases/set-answer.use-case';
import { AnswerRepository } from './infrastructure/answer.repository';

const useCases = [
  CreateQuizQuestionUseCase,
  UpdateQuizQuestionUseCase,
  DeleteQuizQuestionUseCase,
  SetPublishStatusQuizQuestionUseCase,
  ConnectionGameUseCase,
  GetCurrentUserUnfinishedGame,
  GetGameByIdUseCase,
  SetAnswerUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionEntity,
      GameQuestionEntity,
      GameEntity,
      PlayerEntity,
      AnswerEntity,
    ]),
    CqrsModule,
  ],
  controllers: [SaQuizQuestionsController, QuizGameController],
  providers: [
    ...useCases,
    QuestionsRepository,
    QuestionsQueryRepository,
    GameRepository,
    GameQuestionsRepository,
    PlayerRepository,
    GameQueryRepository,
    AnswerRepository,
  ],
  exports: [],
})
export class QuizGameModule {}
