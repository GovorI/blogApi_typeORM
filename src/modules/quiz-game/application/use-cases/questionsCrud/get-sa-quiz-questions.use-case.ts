import { Injectable } from '@nestjs/common';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetSaQuizQuestionsQueryParams } from '../../../api/input-dto/sa-quiz-questions.get-query-params.input-dto';
import { QuizQuestionViewDto } from '../../../api/view-dto/quiz-question.view-dto';
import { QuestionsQueryRepository } from '../../../infrastructure/questions.query-repository';

@Injectable()
export class GetSaQuizQuestionsUseCase {
  constructor(
    private readonly quizQuestionsQueryRepository: QuestionsQueryRepository,
  ) {}

  async execute(
    query: GetSaQuizQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuizQuestionViewDto[]>> {
    return this.quizQuestionsQueryRepository.getAll(query);
  }
}
