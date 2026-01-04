import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateQuizQuestionInputDto } from '../../api/input-dto/quiz-question.input-dto';
import { QuizQuestionsRepository } from '../../infrastructure/quiz-questions.repository';

export class CreateQuizQuestionCommand {
  constructor(public readonly dto: CreateQuizQuestionInputDto) {}
}

@CommandHandler(CreateQuizQuestionCommand)
export class CreateQuizQuestionUseCase
  implements ICommandHandler<CreateQuizQuestionCommand>
{
  constructor(private readonly quizQuestionsRepository: QuizQuestionsRepository) {}

  async execute(command: CreateQuizQuestionCommand): Promise<string> {
    const entity = this.quizQuestionsRepository.createEntity({
      body: command.dto.body,
      correctAnswers: command.dto.correctAnswers,
      published: false,
    });

    const saved = await this.quizQuestionsRepository.save(entity);
    return saved.id;
  }
}
