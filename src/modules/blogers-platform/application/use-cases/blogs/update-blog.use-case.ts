import { CreateBlogDto } from '../../../dto/create-blog.dto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsSqlRepository } from '../../../infrastructure/blogs.sql-repository';

export class UpdateBlogCommand {
  constructor(
    public id: string,
    public dto: CreateBlogDto,
  ) {}
}

@CommandHandler(UpdateBlogCommand)
export class UpdateBlogUseCase implements ICommandHandler<UpdateBlogCommand> {
  constructor(private blogsRepository: BlogsSqlRepository) {}

  async execute(command: UpdateBlogCommand): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(command.id);

    blog.update(command.dto);

    await this.blogsRepository.save(blog);
  }
}
