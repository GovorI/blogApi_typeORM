import { PostEntity } from '../../domain/post-entity';
import { ISqlPost } from '../posts-sql-repository';

export class PostsAdapter {
  static toEntity(sqlPost: ISqlPost): PostEntity {
    return new PostEntity({
      id: sqlPost.id,
      title: sqlPost.title,
      shortDescription: sqlPost.shortDescription,
      content: sqlPost.content,
      blogId: sqlPost.blogId,
      createdAt: new Date(sqlPost.createdAt),
      updatedAt: new Date(sqlPost.updatedAt),
      deletedAt: sqlPost.deletedAt ? new Date(sqlPost.deletedAt) : null,
    });
  }

  static toSql(postEntity: PostEntity): Partial<ISqlPost> {
    return {
      id: postEntity.id,
      title: postEntity.title,
      shortDescription: postEntity.shortDescription,
      content: postEntity.content,
      blogId: postEntity.blogId,
      createdAt: postEntity.createdAt.toISOString(),
      updatedAt: postEntity.updatedAt.toISOString(),
      deletedAt: postEntity.deletedAt?.toISOString() || null,
    };
  }
}
