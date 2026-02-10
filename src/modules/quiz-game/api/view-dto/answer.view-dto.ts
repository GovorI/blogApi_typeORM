import { AnswerEntity, answerStatuses } from '../../domain/answer.entity';

export class AnswerViewDto {
  questionId: string;
  answerStatus: answerStatuses;
  addedAt: Date;

  static mapToView(entity: AnswerEntity): AnswerViewDto {
    return {
      questionId: entity.questionId,
      answerStatus: entity.status,
      addedAt: entity.addedAt,
    };
  }
}
