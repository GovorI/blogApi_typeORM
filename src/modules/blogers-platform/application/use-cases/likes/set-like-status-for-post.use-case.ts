import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LikeStatusInputDto } from '../../../api/input-dto/like-status.input-dto';
import { LikesPostRepository } from '../../../infrastructure/likes-post.repository';
import { PostsRepository } from '../../../infrastructure/posts.repository';
import { LikeStatuses } from '../../../dto/like-status.dto';
import { LikeForPostEntity } from '../../../domain/like-for-post.entity';

export class SetLikeStatusForPostCommand {
  constructor(
    public postId: string,
    public likeStatusDto: LikeStatusInputDto,
    public userId: string,
  ) {}
}

@CommandHandler(SetLikeStatusForPostCommand)
export class SetLikeStatusForPostUseCase
  implements ICommandHandler<SetLikeStatusForPostCommand>
{
  constructor(
    private postsRepository: PostsRepository,
    private likesRepository: LikesPostRepository,
  ) {}

  async execute(command: SetLikeStatusForPostCommand) {
    const { postId, userId } = command;
    const likeStatus = command.likeStatusDto.likeStatus;

    await this.postsRepository.findOrNotFoundFail(postId);
    try {
      const existingLike: LikeForPostEntity =
        await this.likesRepository.getLikeByPostIdAndUserIdOrFail(
          postId,
          userId,
        );

      if (existingLike) {
        if (likeStatus === LikeStatuses.None) {
          await this.likesRepository.deleteByPostIdAndUserId(
            existingLike.postId,
            existingLike.userId,
          );
        } else if (existingLike.status !== likeStatus) {
          existingLike.status = likeStatus;
          await this.likesRepository.save(existingLike);
        }
      }
    } catch {
      // If like doesn't exist and we want to set it to something other than None
      if (likeStatus !== LikeStatuses.None) {
        const newLikeStatus = this.likesRepository.create({
          userId: command.userId,
          postId: command.postId,
          status: command.likeStatusDto.likeStatus,
        });

        await this.likesRepository.save(newLikeStatus);
      }
    }
  }
}
