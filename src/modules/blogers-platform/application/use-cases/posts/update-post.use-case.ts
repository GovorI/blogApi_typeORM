import { UpdatePostInputDto } from '../../../api/input-dto/post.input.dto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsRepository } from '../../../infrastructure/posts.repository';
import { BlogsRepository } from '../../../infrastructure/blogs.repository';
import { PostEntity } from '../../../domain/post-entity';
import { BlogNotFoundException } from '../../../../../core/domain';

export class UpdatePostCommand {
  constructor(
    public blogId: string,
    public postId: string,
    public dto: UpdatePostInputDto,
  ) {}
}

@CommandHandler(UpdatePostCommand)
export class UpdatePostUseCase implements ICommandHandler<UpdatePostCommand> {
  constructor(
    private postsRepository: PostsRepository,
    private blogsRepository: BlogsRepository,
  ) {}

  async execute(command: UpdatePostCommand): Promise<void> {
    const post: PostEntity = await this.postsRepository.findOrNotFoundFail(
      command.postId,
    );

    if (post.blogId !== command.blogId) {
      throw new BlogNotFoundException('Blog not found');
    }

    post.update(command.dto);

    await this.postsRepository.save(post);
  }
}
