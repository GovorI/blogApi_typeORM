import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePostInputDto } from '../../../api/input-dto/post.input.dto';
import { PostsRepository } from '../../../infrastructure/posts.repository';
import { BlogsRepository } from '../../../infrastructure/blogs.repository';

export class CreatePostForBlogCommand {
  constructor(public postData: CreatePostInputDto) {}
}

@CommandHandler(CreatePostForBlogCommand)
export class CreatePostForBlogUseCase
  implements ICommandHandler<CreatePostForBlogCommand>
{
  constructor(
    private blogsRepository: BlogsRepository,
    private postsRepository: PostsRepository,
  ) {}

  async execute(command: CreatePostForBlogCommand): Promise<string> {
    await this.blogsRepository.findOrNotFoundFail(command.postData.blogId);

    const post = this.postsRepository.create({
      title: command.postData.title,
      shortDescription: command.postData.shortDescription,
      content: command.postData.content,
      blogId: command.postData.blogId,
    });
    await this.postsRepository.save(post);
    return post.id;
  }
}
