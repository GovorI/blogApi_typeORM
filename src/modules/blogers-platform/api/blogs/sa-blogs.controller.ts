import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BadRequestException } from '../../../../core/domain/domain.exception';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateBlogInputDto,
  UpdateBlogInputDto,
} from '../input-dto/blog.input-dto';
import { BlogsQueryRepository } from '../../infrastructure/blogs.query-repository';
import { GetBlogsQueryParams } from './get-blogs-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { BlogViewDto } from '../view-dto/blog.view-dto';
import {
  CreatePostForBlogInputDto,
  CreatePostInputDto,
  UpdatePostInputDto,
} from '../input-dto/post.input.dto';
import { PostsQueryRepository } from '../../infrastructure/posts.query-repository';
import { GetPostsQueryParams } from '../posts/get-posts-query-params.input-dto';
import { BasicAuthGuard } from '../../../user-accounts/guards/basic/basic-auth.guard';
import { CreateBlogCommand } from '../../application/use-cases/blogs/create-blog.use-case';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateBlogCommand } from '../../application/use-cases/blogs/update-blog.use-case';
import { DeleteBlogCommand } from '../../application/use-cases/blogs/delete-blog.use-case';
import { PostViewDto } from '../view-dto/post.view-dto';
import { JwtPayload } from '../../../user-accounts/domain/jwt-payload.interface';
import { CreatePostForBlogCommand } from '../../application/use-cases/posts/create-post-for-blog.use-case';
import { UpdatePostCommand } from '../../application/use-cases/posts/update-post.use-case';
import { DeletePostCommand } from '../../application/use-cases/posts/delete-post.use-case';

@ApiTags('sa/blogs')
@Controller('sa/blogs')
export class SaBlogsController {
  constructor(
    private readonly blogsQueryRepo: BlogsQueryRepository,
    private readonly postsQueryRepository: PostsQueryRepository,
    private commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(BasicAuthGuard)
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

  @Post()
  @UseGuards(BasicAuthGuard)
  @ApiOperation({ summary: 'Create a new blog' })
  @ApiBody({ type: CreateBlogInputDto })
  @ApiResponse({
    status: 201,
    description: 'Blog created successfully',
    type: BlogViewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createBlog(@Body() dto: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId: string = await this.commandBus.execute(
      new CreateBlogCommand(dto),
    );
    return this.blogsQueryRepo.getByIdOrNotFoundFail(blogId);
  }

  @Put(':id')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Update blog by ID' })
  @ApiParam({ name: 'id', description: 'Blog ID' })
  @ApiBody({ type: UpdateBlogInputDto })
  @ApiResponse({ status: 204, description: 'Blog updated successfully' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateBlog(
    @Param('id') id: string,
    @Body() dto: UpdateBlogInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateBlogCommand(id, dto));
  }

  @Delete(':id')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete blog by ID' })
  @ApiParam({ name: 'id', description: 'Blog ID' })
  @ApiResponse({ status: 204, description: 'Blog deleted successfully' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async deleteById(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteBlogCommand(id));
  }

  @Post(':blogId/posts')
  @UseGuards(BasicAuthGuard)
  async createPostForBlog(
    @Param('blogId') blogId: string,
    @Body() postData: CreatePostForBlogInputDto,
  ): Promise<PostViewDto> {
    if (!blogId) throw new BadRequestException('Blog ID is required');

    const createPostDto: CreatePostInputDto = {
      ...postData,
      blogId: blogId,
    };

    const postId: string = await this.commandBus.execute(
      new CreatePostForBlogCommand(createPostDto),
    );
    return this.postsQueryRepository.getByIdOrNotFoundFail(postId);
  }

  @Get(':blogId/posts')
  @UseGuards(BasicAuthGuard)
  async getPostsForBlog(
    @Param('blogId') blogId: string,
    @Query() query: GetPostsQueryParams,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const currentUserId = req.user?.sub;
    return this.postsQueryRepository.getPostsForBlog(
      blogId,
      query,
      currentUserId,
    );
  }

  @Put(':blogId/posts/:postId')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  async updateExistingPostById(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostInputDto,
  ): Promise<void> {
    await this.commandBus.execute(new UpdatePostCommand(blogId, postId, dto));
  }

  @Delete(':blogId/posts/:postId')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  async deleteExistingPostById(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
  ) {
    await this.commandBus.execute(new DeletePostCommand(blogId, postId));
  }
}
