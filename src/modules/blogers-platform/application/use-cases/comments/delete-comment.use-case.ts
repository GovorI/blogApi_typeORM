import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { CommentRepository } from '../../../infrastructure/comment.repository';

export class DeleteCommentCommand {
  constructor(
    public commentId: string,
    public userId: string,
  ) {}
}

@CommandHandler(DeleteCommentCommand)
export class DeleteCommentUseCase
  implements ICommandHandler<DeleteCommentCommand>
{
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(command: DeleteCommentCommand): Promise<void> {
    const comment = await this.commentRepository.findByIdOrNotFoundFail(
      command.commentId,
    );
    if (comment.userId !== command.userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'You are not allowed to delete this comment',
      });
    }
    comment.makeDeleted();
    await this.commentRepository.save(comment);
  }
}
