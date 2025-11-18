import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsSqlRepository } from '../../../infrastructure/posts-sql-repository';
import { BlogNotFoundException } from '../../../../../core/domain';

export class DeletePostCommand {
  constructor(
    public blogId: string,
    public postId: string,
  ) {}
}

@CommandHandler(DeletePostCommand)
export class DeletePostUseCase implements ICommandHandler<DeletePostCommand> {
  constructor(private postsRepository: PostsSqlRepository) {}

  async execute(command: DeletePostCommand): Promise<void> {
    const post = await this.postsRepository.findOrNotFoundFail(command.postId);
    if (post.blogId !== command.blogId) {
      throw new BlogNotFoundException('Blog not found');
    }
    post.makeDeleted();
    await this.postsRepository.save(post);
  }
}
