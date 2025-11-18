import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LikeStatusInputDto } from '../../../api/input-dto/like-status.input-dto';
import { LikesPostRepository } from '../../../infrastructure/likes-post.repository';
import { PostsSqlRepository } from '../../../infrastructure/posts-sql-repository';
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
    private postsRepository: PostsSqlRepository,
    private likesRepository: LikesPostRepository,
  ) {}

  async execute(command: SetLikeStatusForPostCommand) {
    const { postId, userId } = command;
    const likeStatus = command.likeStatusDto.likeStatus;

    await this.postsRepository.findOrNotFoundFail(postId);
    try {
      const existingLike =
        await this.likesRepository.getLikeByPostIdAndUserIdOrFail(
          postId,
          userId,
        );

      if (existingLike) {
        if (likeStatus === 'None') {
          await this.likesRepository.deleteByPostIdAndUserId(
            existingLike.postId,
            existingLike.userId,
          );
        } else if (existingLike.status !== likeStatus) {
          existingLike.status = likeStatus;
          await this.likesRepository.save(existingLike);
        }
      }
    } catch (error) {
      // If like doesn't exist and we want to set it to something other than None
      if (likeStatus !== 'None') {
        const newLikeStatus = new LikeForPostEntity({
          userId: command.userId,
          postId: command.postId,
          status: command.likeStatusDto.likeStatus,
        });
        await this.likesRepository.save(newLikeStatus);
      }
    }
  }
}
