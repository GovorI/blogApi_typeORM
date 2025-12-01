import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsRepository } from '../../../infrastructure/blogs.repository';

export class DeleteBlogCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteBlogCommand)
export class DeleteBlogUseCase implements ICommandHandler<DeleteBlogCommand> {
  constructor(private blogsRepository: BlogsRepository) {}
  async execute(command: DeleteBlogCommand) {
    const blog = await this.blogsRepository.findOrNotFoundFail(command.id);
    blog.makeDeleted();
    await this.blogsRepository.save(blog);
  }
}
