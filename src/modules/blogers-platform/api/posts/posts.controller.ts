import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostsQueryRepository } from '../../infrastructure/posts.query-repository';
import { GetPostsQueryParams } from './get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../view-dto/post.view-dto';
import { JwtOptionalGuard } from '../../../user-accounts/guards/bearer/jwt-optional.guard';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';
import { CommentsQueryRepository } from '../../infrastructure/comment.query-repository';
import { CommandBus } from '@nestjs/cqrs';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsQueryRepository: PostsQueryRepository,
    private readonly commentsQueryRepository: CommentsQueryRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(JwtOptionalGuard)
  async getAll(
    @Query() query: GetPostsQueryParams,
    @Req() req: Request & { user?: UserContextDto },
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const currentUserId = req.user?.id;
    return this.postsQueryRepository.getAll(query, currentUserId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalGuard)
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: UserContextDto },
  ) {
    // Extract user ID if present in the request (set by optional auth middleware)
    const currentUserId = req.user?.id;
    return await this.postsQueryRepository.getByIdOrNotFoundFail(
      id,
      currentUserId,
    );
  }
}
