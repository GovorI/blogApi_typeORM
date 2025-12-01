import { CreateBlogDto } from '../../../dto/create-blog.dto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsRepository } from '../../../infrastructure/blogs.repository';

export class CreateBlogCommand {
  constructor(public dto: CreateBlogDto) {}
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogUseCase implements ICommandHandler<CreateBlogCommand> {
  constructor(private readonly blogsRepository: BlogsRepository) {}

  async execute(command: CreateBlogCommand): Promise<string> {
    const blog = this.blogsRepository.create({
      name: command.dto.name,
      description: command.dto.description,
      websiteUrl: command.dto.websiteUrl,
    });
    await this.blogsRepository.save(blog);
    return blog.id;
  }
}
