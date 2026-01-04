import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaQuizQuestionsController } from './api/sa/sa-quiz-questions.controller';
import { CreateQuizQuestionUseCase } from './application/use-cases/create-quiz-question.use-case';
import { DeleteQuizQuestionUseCase } from './application/use-cases/delete-quiz-question.use-case';
import { SetPublishStatusQuizQuestionUseCase } from './application/use-cases/set-publish-status-quiz-question.use-case';
import { UpdateQuizQuestionUseCase } from './application/use-cases/update-quiz-question.use-case';
import { QuizQuestionEntity } from './domain/quiz-question.entity';
import { QuizQuestionsRepository } from './infrastructure/quiz-questions.repository';
import { QuizQuestionsQueryRepository } from './infrastructure/quiz-questions.query-repository';
import { CqrsModule } from '@nestjs/cqrs';

const useCases = [
  CreateQuizQuestionUseCase,
  UpdateQuizQuestionUseCase,
  DeleteQuizQuestionUseCase,
  SetPublishStatusQuizQuestionUseCase,
];

@Module({
  imports: [TypeOrmModule.forFeature([QuizQuestionEntity]), CqrsModule],
  controllers: [SaQuizQuestionsController],
  providers: [
    QuizQuestionsRepository,
    QuizQuestionsQueryRepository,
    ...useCases,
  ],
  exports: [],
})
export class QuizGameModule {}
