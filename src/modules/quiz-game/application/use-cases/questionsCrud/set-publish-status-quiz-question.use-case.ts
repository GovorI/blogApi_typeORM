import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../../../infrastructure/questions.repository';

export class SetPublishStatusQuizQuestionCommand {
  constructor(
    public readonly id: string,
    public readonly published: boolean,
  ) {}
}

@CommandHandler(SetPublishStatusQuizQuestionCommand)
export class SetPublishStatusQuizQuestionUseCase
  implements ICommandHandler<SetPublishStatusQuizQuestionCommand>
{
  constructor(private readonly quizQuestionsRepository: QuestionsRepository) {}

  async execute(command: SetPublishStatusQuizQuestionCommand): Promise<void> {
    const entity = await this.quizQuestionsRepository.findByIdOrNotFoundFail(
      command.id,
    );
    entity.published = command.published;
    entity.updatedAt = new Date();
    await this.quizQuestionsRepository.save(entity);
  }
}
