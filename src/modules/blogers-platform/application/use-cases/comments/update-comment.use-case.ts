import { UpdateCommentDto } from '../../../dto/update-comment.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentRepository } from '../../../infrastructure/comment.repository';

export class UpdateCommentCommand {
  constructor(
    public commentId: string,
    public updateCommentDto: UpdateCommentDto,
    public userId: string,
  ) {}
}

@CommandHandler(UpdateCommentCommand)
export class UpdateCommentUseCase
  implements ICommandHandler<UpdateCommentCommand>
{
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(command: UpdateCommentCommand) {
    const comment = await this.commentRepository.findByIdOrNotFoundFail(
      command.commentId,
    );
    if (comment.userId !== command.userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'You are not allowed to edit this comment',
      });
    }
    comment.content = command.updateCommentDto.content;
    return this.commentRepository.save(comment);
  }
}
