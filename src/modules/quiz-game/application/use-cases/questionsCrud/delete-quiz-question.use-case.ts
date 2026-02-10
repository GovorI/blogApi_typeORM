import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../../../infrastructure/questions.repository';

export class DeleteQuizQuestionCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(DeleteQuizQuestionCommand)
export class DeleteQuizQuestionUseCase
  implements ICommandHandler<DeleteQuizQuestionCommand>
{
  constructor(private readonly quizQuestionsRepository: QuestionsRepository) {}

  async execute(command: DeleteQuizQuestionCommand): Promise<void> {
    return this.quizQuestionsRepository.deleteByIdOrNotFoundFail(command.id);
  }
}
