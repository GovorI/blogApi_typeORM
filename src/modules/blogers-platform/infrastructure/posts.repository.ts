import { Injectable } from '@nestjs/common';
import { PostEntity } from '../domain/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PostNotFoundException } from '../../../core/domain';
import { randomUUID } from 'crypto';

@Injectable()
export class PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
  ) {}

  create(data: Partial<PostEntity>): PostEntity {
    return this.postsRepository.create({
      ...data,
      id: data.id || randomUUID(),
    });
  }

  save(post: PostEntity): Promise<PostEntity> {
    return this.postsRepository.save(post);
  }

  async findOrNotFoundFail(id: string): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!post) {
      throw new PostNotFoundException('Post not found');
    }
    return post;
  }
}
