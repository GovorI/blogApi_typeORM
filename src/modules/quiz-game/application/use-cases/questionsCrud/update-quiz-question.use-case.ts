import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateQuizQuestionInputDto } from '../../../api/input-dto/quiz-question.input-dto';
import { QuestionsRepository } from '../../../infrastructure/questions.repository';

export class UpdateQuizQuestionCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateQuizQuestionInputDto,
  ) {}
}

@CommandHandler(UpdateQuizQuestionCommand)
export class UpdateQuizQuestionUseCase
  implements ICommandHandler<UpdateQuizQuestionCommand>
{
  constructor(private readonly quizQuestionsRepository: QuestionsRepository) {}

  async execute(command: UpdateQuizQuestionCommand): Promise<void> {
    const entity = await this.quizQuestionsRepository.findByIdOrNotFoundFail(
      command.id,
    );
    entity.body = command.dto.body;
    entity.correctAnswers = command.dto.correctAnswers;
    entity.updatedAt = new Date();
    await this.quizQuestionsRepository.save(entity);
  }
}
