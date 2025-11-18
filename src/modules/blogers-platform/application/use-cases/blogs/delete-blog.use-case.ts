import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsSqlRepository } from '../../../infrastructure/blogs.sql-repository';

export class DeleteBlogCommand {
  constructor(public id: string) {}
}

@CommandHandler(DeleteBlogCommand)
export class DeleteBlogUseCase implements ICommandHandler<DeleteBlogCommand> {
  constructor(private blogsRepository: BlogsSqlRepository) {}
  async execute(command: DeleteBlogCommand) {
    const blog = await this.blogsRepository.findOrNotFoundFail(command.id);
    blog.makeDeleted();
    await this.blogsRepository.save(blog);
  }
}
