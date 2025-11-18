import { BlogEntity } from '../../domain/blog-entity';
import { ISqlBlog } from '../blogs.sql-repository';

export class BlogsAdapter {
  static toEntity(sqlBlog: ISqlBlog): BlogEntity {
    return new BlogEntity({
      id: sqlBlog.id, // Добавляем ID в маппинг
      name: sqlBlog.name,
      description: sqlBlog.description,
      websiteUrl: sqlBlog.websiteUrl,
      isMembership: sqlBlog.isMembership,
      createdAt: new Date(sqlBlog.createdAt),
      updatedAt: new Date(sqlBlog.updatedAt),
      deletedAt: sqlBlog.deletedAt ? new Date(sqlBlog.deletedAt) : null,
    });
  }

  static toSql(blogEntity: BlogEntity): Partial<ISqlBlog> {
    return {
      id: blogEntity.id, // Добавляем ID и сюда для консистентности
      name: blogEntity.name,
      description: blogEntity.description,
      websiteUrl: blogEntity.websiteUrl,
      isMembership: blogEntity.isMembership,
      createdAt: blogEntity.createdAt.toISOString(),
      updatedAt: blogEntity.updatedAt.toISOString(),
      deletedAt: blogEntity.deletedAt?.toISOString() || null,
    };
  }
}
