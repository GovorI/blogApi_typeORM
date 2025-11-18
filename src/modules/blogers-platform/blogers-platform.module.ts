import { Module } from '@nestjs/common';
import { SaBlogsController } from './api/blogs/sa-blogs.controller';
import { BlogsQueryRepository } from './infrastructure/blogs.query-repository';
import { PostsSqlRepository } from './infrastructure/posts-sql-repository';
import { PostsQueryRepository } from './infrastructure/posts.query-repository';
import { PublicPostsController } from './api/posts/public-posts.controller';
import { CommentsController } from './api/comments/comments.controller';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { CommentRepository } from './infrastructure/comment.repository';
import { CommentsQueryRepository } from './infrastructure/comment.query-repository';
import { LikesCommentRepository } from './infrastructure/likes-comment.repository';
import { CreateBlogUseCase } from './application/use-cases/blogs/create-blog.use-case';
import { UpdateBlogUseCase } from './application/use-cases/blogs/update-blog.use-case';
import { CqrsModule } from '@nestjs/cqrs';
import { DeleteBlogUseCase } from './application/use-cases/blogs/delete-blog.use-case';
import { CreatePostForBlogUseCase } from './application/use-cases/posts/create-post-for-blog.use-case';
import { UpdatePostUseCase } from './application/use-cases/posts/update-post.use-case';
import { DeletePostUseCase } from './application/use-cases/posts/delete-post.use-case';
import { CreateCommentForPostUseCase } from './application/use-cases/comments/create-comment-for-post.use-case';
import { SetLikeStatusForPostUseCase } from './application/use-cases/likes/set-like-status-for-post.use-case';
import { SetLikeStatusForCommentUseCase } from './application/use-cases/likes/set-like-status-for-comment.use-case';
import { UpdateCommentUseCase } from './application/use-cases/comments/update-comment.use-case';
import { DeleteCommentUseCase } from './application/use-cases/comments/delete-comment.use-case';
import { BlogsSqlRepository } from './infrastructure/blogs.sql-repository';
import { BlogsController } from './api/blogs/blogs.controller';
import { PostsController } from './api/posts/posts.controller';
import { LikesPostRepository } from './infrastructure/likes-post.repository';

const useCases = [
  CreateBlogUseCase,
  UpdateBlogUseCase,
  DeleteBlogUseCase,
  CreatePostForBlogUseCase,
  UpdatePostUseCase,
  DeletePostUseCase,
  CreateCommentForPostUseCase,
  SetLikeStatusForPostUseCase,
  SetLikeStatusForCommentUseCase,
  UpdateCommentUseCase,
  DeleteCommentUseCase,
];

@Module({
  imports: [UserAccountsModule, CqrsModule],
  controllers: [
    SaBlogsController,
    BlogsController,
    PostsController,
    PublicPostsController,
    CommentsController,
  ],
  providers: [
    LikesCommentRepository,
    LikesPostRepository,
    BlogsSqlRepository,
    BlogsQueryRepository,
    PostsSqlRepository,
    CommentRepository,
    PostsQueryRepository,
    CommentsQueryRepository,
    ...useCases,
  ],
})
export class BlogersPlatformModule {}
