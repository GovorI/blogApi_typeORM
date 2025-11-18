import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePostInputDto } from '../input-dto/post.input.dto';
import { GetPostsQueryParams } from './get-posts-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { PostViewDto } from '../view-dto/post.view-dto';
import { CreateCommentInputDto } from '../input-dto/create-comment.input.dto';
import { LikeStatusInputDto } from '../input-dto/like-status.input-dto';
import { JwtAuthGuard } from '../../../user-accounts/guards/bearer/jwt-auth.guard';
import { JwtOptionalGuard } from '../../../user-accounts/guards/bearer/jwt-optional.guard';
import { ExtractUserFromRequest } from '../../../user-accounts/guards/decorators/extract-user-from-request';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';
import { BasicAuthGuard } from '../../../user-accounts/guards/basic/basic-auth.guard';
import { CommentViewDto } from '../view-dto/comment.view-dto';
import { CommentsQueryRepository } from '../../infrastructure/comment.query-repository';
import { CreatePostForBlogCommand } from '../../application/use-cases/posts/create-post-for-blog.use-case';
import { CommandBus } from '@nestjs/cqrs';
import { CreateCommentForPostCommand } from '../../application/use-cases/comments/create-comment-for-post.use-case';
import { SetLikeStatusForPostCommand } from '../../application/use-cases/likes/set-like-status-for-post.use-case';
import { PostsSqlRepository } from '../../infrastructure/posts-sql-repository';
import { PostsQueryRepository } from '../../infrastructure/posts.query-repository';
import { GetCommentsQueryParams } from '../comments/get-comments-query-params.input-dto';

@Controller('posts')
export class PublicPostsController {
  constructor(
    private readonly postsQueryRepository: PostsQueryRepository,
    private readonly postsSqlRepository: PostsSqlRepository,
    private readonly commentsQueryRepository: CommentsQueryRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @Post()
  @UseGuards(BasicAuthGuard)
  async createPost(@Body() dto: CreatePostInputDto): Promise<PostViewDto> {
    const postId: string = await this.commandBus.execute(
      new CreatePostForBlogCommand(dto),
    );
    return this.postsQueryRepository.getByIdOrNotFoundFail(postId);
  }

  @Put('/:id/like-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async likePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() likeStatus: LikeStatusInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    await this.commandBus.execute(
      new SetLikeStatusForPostCommand(postId, likeStatus, user.id),
    );
  }

  @Get('/:id/comments')
  @UseGuards(JwtOptionalGuard)
  async getAllCommentsForPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetCommentsQueryParams,
    @ExtractUserFromRequest() user: UserContextDto | null,
  ) {
    const userId = user?.id || undefined;
    return this.commentsQueryRepository.getAllCommentsForPost(
      id,
      query,
      userId,
    );
  }

  @Post('/:id/comments')
  @UseGuards(JwtAuthGuard)
  async createCommentForPost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() createCommentInputDto: CreateCommentInputDto,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<CommentViewDto> {
    const commentId: string = await this.commandBus.execute(
      new CreateCommentForPostCommand(
        postId,
        createCommentInputDto.content,
        user.id,
      ),
    );

    console.log('comment:', commentId);

    return this.commentsQueryRepository.getByIdOrNotFoundFail(
      commentId,
      user.id,
    );
  }

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
    const currentUserId = req.user?.id;
    return await this.postsQueryRepository.getByIdOrNotFoundFail(
      id,
      currentUserId,
    );
  }
}
