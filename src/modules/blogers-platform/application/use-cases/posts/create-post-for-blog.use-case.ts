import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePostInputDto } from '../../../api/input-dto/post.input.dto';
import { PostsSqlRepository } from '../../../infrastructure/posts-sql-repository';
import { randomUUID } from 'crypto';
import { PostEntity } from '../../../domain/post-entity';
import { BlogsSqlRepository } from '../../../infrastructure/blogs.sql-repository';

export class CreatePostForBlogCommand {
  constructor(public postData: CreatePostInputDto) {}
}

@CommandHandler(CreatePostForBlogCommand)
export class CreatePostForBlogUseCase
  implements ICommandHandler<CreatePostForBlogCommand>
{
  constructor(
    private blogsRepository: BlogsSqlRepository,
    private postsRepository: PostsSqlRepository,
  ) {}

  async execute(command: CreatePostForBlogCommand): Promise<string> {
    await this.blogsRepository.findOrNotFoundFail(command.postData.blogId);

    const post = new PostEntity({
      id: randomUUID(),
      title: command.postData.title,
      shortDescription: command.postData.shortDescription,
      content: command.postData.content,
      blogId: command.postData.blogId,
    });
    await this.postsRepository.save(post);
    return post.id;
  }
}
