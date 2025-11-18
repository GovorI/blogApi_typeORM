import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LikeStatusInputDto } from '../../../api/input-dto/like-status.input-dto';
import { LikesCommentRepository } from '../../../infrastructure/likes-comment.repository';
import { CommentRepository } from '../../../infrastructure/comment.repository';
import { LikeForCommentEntity } from '../../../domain/like-for-comment.entity';

export class SetLikeStatusForCommentCommand {
  constructor(
    public commentId: string,
    public likeStatusDto: LikeStatusInputDto,
    public userId: string,
  ) {}
}

@CommandHandler(SetLikeStatusForCommentCommand)
export class SetLikeStatusForCommentUseCase
  implements ICommandHandler<SetLikeStatusForCommentCommand>
{
  constructor(
    private commentRepository: CommentRepository,
    private likesRepository: LikesCommentRepository,
  ) {}

  async execute(command: SetLikeStatusForCommentCommand): Promise<void> {
    const { commentId, userId } = command;
    const { likeStatus } = command.likeStatusDto;

    await this.commentRepository.findByIdOrNotFoundFail(commentId);
    try {
      const existingLike =
        await this.likesRepository.getLikeByCommentIdAndUserIdOrNotFoundFail(
          commentId,
          userId,
        );

      if (existingLike) {
        if (likeStatus === 'None') {
          await this.likesRepository.deleteByCommentIdAndUserId(
            existingLike.commentId,
            existingLike.userId,
          );
        } else if (existingLike.status !== likeStatus) {
          existingLike.status = likeStatus;
          await this.likesRepository.save(existingLike);
        }
      }
    } catch (error) {
      if (likeStatus !== 'None') {
        const newLikeStatus = new LikeForCommentEntity({
          userId: command.userId,
          commentId: command.commentId,
          status: command.likeStatusDto.likeStatus,
        });
        await this.likesRepository.save(newLikeStatus);
      }
    }
  }
}
