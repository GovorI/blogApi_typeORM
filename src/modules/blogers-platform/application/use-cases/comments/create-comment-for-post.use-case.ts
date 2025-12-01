import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersService } from '../../../../user-accounts/application/user-service';
import { CommentRepository } from '../../../infrastructure/comment.repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostsRepository } from '../../../infrastructure/posts.repository';

export class CreateCommentForPostCommand {
  constructor(
    public postId: string,
    public content: string,
    public userId: string,
  ) {}
}

@CommandHandler(CreateCommentForPostCommand)
export class CreateCommentForPostUseCase
  implements ICommandHandler<CreateCommentForPostCommand>
{
  constructor(
    private usersService: UsersService,
    private commentRepository: CommentRepository,
    private postsRepository: PostsRepository,
  ) {}

  async execute(command: CreateCommentForPostCommand): Promise<string> {
    try {
      await this.usersService.getUserByIdOrNotFound(command.userId);
      await this.postsRepository.findOrNotFoundFail(command.postId);

      const comment = this.commentRepository.create({
        postId: command.postId,
        content: command.content,
        userId: command.userId,
      });

      await this.commentRepository.save(comment);
      return comment.id;
    } catch (e) {
      if (e instanceof DomainException) {
        throw e;
      }
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during comment save',
        extensions: [{ message: e.message, key: 'database' }],
      });
    }
  }
}
