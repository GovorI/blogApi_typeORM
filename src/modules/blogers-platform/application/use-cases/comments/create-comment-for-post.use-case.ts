import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersService } from '../../../../user-accounts/application/user-service';
import { CommentRepository } from '../../../infrastructure/comment.repository';
import { CommentEntity } from '../../../domain/comment-entity';
import { randomUUID } from 'crypto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PostsSqlRepository } from '../../../infrastructure/posts-sql-repository';

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
    private postsSqlRepository: PostsSqlRepository,
  ) {}

  async execute(command: CreateCommentForPostCommand): Promise<string> {
    console.log('CreateCommentForPostUseCase started with:', command);
    try {
      await this.usersService.getUserByIdOrNotFound(command.userId);
      await this.postsSqlRepository.findOrNotFoundFail(command.postId);

      const comment = new CommentEntity({
        id: randomUUID(),
        postId: command.postId,
        content: command.content,
        userId: command.userId,
      });
      console.log('Comment entity created:', comment);

      await this.commentRepository.save(comment);
      console.log('Comment saved successfully');
      return comment.id;
    } catch (e) {
      console.log('Error in CreateCommentForPostUseCase:', e);
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
