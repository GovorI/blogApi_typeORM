import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BlogsQueryRepository } from '../../infrastructure/blogs.query-repository';
import { BlogViewDto } from '../view-dto/blog.view-dto';
import { PostsQueryRepository } from '../../infrastructure/posts.query-repository';
import { CommandBus } from '@nestjs/cqrs';
import { GetBlogsQueryParams } from './get-blogs-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { GetPostsQueryParams } from '../posts/get-posts-query-params.input-dto';
import { PostViewDto } from '../view-dto/post.view-dto';
import { JwtOptionalGuard } from '../../../user-accounts/guards/bearer/jwt-optional.guard';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogsQueryRepo: BlogsQueryRepository,
    private readonly postsQueryRepository: PostsQueryRepository,
    private commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all blogs with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of blogs with pagination',
  })
  async getAll(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.blogsQueryRepo.getAll(query);
  }

  @Get(':id/posts')
  @UseGuards(JwtOptionalGuard)
  async getPostsForBlog(
    @Param('id') id: string,
    @Query() query: GetPostsQueryParams,
    @Req() req: Request & { user?: UserContextDto },
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const currentUserId = req.user?.id;
    return this.postsQueryRepository.getPostsForBlog(id, query, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blog by ID' })
  @ApiParam({ name: 'id', description: 'Blog ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog found',
    type: BlogViewDto,
  })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async getById(@Param('id') id: string): Promise<BlogViewDto> {
    return this.blogsQueryRepo.getByIdOrNotFoundFail(id);
  }
}
