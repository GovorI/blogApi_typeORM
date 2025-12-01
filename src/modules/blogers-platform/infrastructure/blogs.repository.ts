import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogEntity } from '../domain/blog-entity';
import { BlogNotFoundException } from '../../../core/domain';
import { IsNull } from 'typeorm';

@Injectable()
export class BlogsRepository {
  constructor(
    @InjectRepository(BlogEntity)
    private readonly blogsRepository: Repository<BlogEntity>,
  ) {}

  create(data: Partial<BlogEntity>): BlogEntity {
    return this.blogsRepository.create({
      ...data,
      id: data.id || randomUUID(),
    });
  }

  save(blog: BlogEntity): Promise<BlogEntity> {
    return this.blogsRepository.save(blog);
  }

  async findOrNotFoundFail(id: string): Promise<BlogEntity> {
    const blog = await this.blogsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!blog) {
      throw new BlogNotFoundException('Blog not found');
    }
    return blog;
  }
}
