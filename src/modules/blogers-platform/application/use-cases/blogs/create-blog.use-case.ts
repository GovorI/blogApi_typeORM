import { CreateBlogDto } from '../../../dto/create-blog.dto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogsSqlRepository } from '../../../infrastructure/blogs.sql-repository';
import { BlogEntity } from '../../../domain/blog-entity';
import { randomUUID } from 'crypto';

export class CreateBlogCommand {
  constructor(public dto: CreateBlogDto) {}
}

@CommandHandler(CreateBlogCommand)
export class CreateBlogUseCase implements ICommandHandler<CreateBlogCommand> {
  constructor(private readonly blogsRepository: BlogsSqlRepository) {}

  async execute(command: CreateBlogCommand): Promise<string> {
    const blog = new BlogEntity({
      id: randomUUID(),
      name: command.dto.name,
      description: command.dto.description,
      websiteUrl: command.dto.websiteUrl,
    });
    await this.blogsRepository.save(blog);
    return blog.id;
  }
}
