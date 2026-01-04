import { QuizQuestionEntity } from '../../domain/quiz-question.entity';

export class QuizQuestionViewDto {
  id: string;
  body: string;
  correctAnswers: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date | null;

  static mapToView(entity: QuizQuestionEntity): QuizQuestionViewDto {
    const dto = new QuizQuestionViewDto();

    dto.id = entity.id;
    dto.body = entity.body;
    dto.correctAnswers = entity.correctAnswers;
    dto.published = entity.published;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    return dto;
  }
}
