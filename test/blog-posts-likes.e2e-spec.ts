import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Blog Posts Likes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let blogId: string;
  const posts: { id: string }[] = [];
  const users: Array<{ id: string; accessToken: string; login: string }> = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    appSetup(app);
    await app.init();

    // Clear database
    await dataSource.query(`TRUNCATE TABLE "Users" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "Posts" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "postLikes" CASCADE;`);

    // Create test users (4 users)
    for (let i = 1; i <= 4; i++) {
      const userResponse = await request(app.getHttpServer())
        .post('/api/sa/users')
        .auth('admin', 'qwerty', { type: 'basic' })
        .send({
          login: `user${i}`,
          password: 'password123',
          email: `user${i}@example.com`,
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: `user${i}`,
          password: 'password123',
        });

      users.push({
        id: userResponse.body.id,
        accessToken: loginResponse.body.accessToken,
        login: `user${i}`,
      });
    }

    // Create a blog
    const blogResponse = await request(app.getHttpServer())
      .post('/api/sa/blogs')
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        name: 'Test Blog',
        description: 'Test Blog Description',
        websiteUrl: 'https://test-blog.com',
      });
    blogId = blogResponse.body.id;

    // Create 6 posts
    for (let i = 0; i < 6; i++) {
      const postResponse = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${blogId}/posts`)
        .auth('admin', 'qwerty', { type: 'basic' })
        .send({
          title: `Post ${i + 1}`,
          shortDescription: `Short description ${i + 1}`,
          content: `Content ${i + 1}`,
        });
      posts.push({ id: postResponse.body.id });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle likes/dislikes and return correct newestLikes order', async () => {
    // Like post 1 by user 1, user 2
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[0].id}/like-status`)
      .set('Authorization', `Bearer ${users[0].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[0].id}/like-status`)
      .set('Authorization', `Bearer ${users[1].accessToken}`)
      .send({ likeStatus: 'Like' });

    // Like post 2 by user 2, user 3
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[1].id}/like-status`)
      .set('Authorization', `Bearer ${users[1].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[1].id}/like-status`)
      .set('Authorization', `Bearer ${users[2].accessToken}`)
      .send({ likeStatus: 'Like' });

    // Dislike post 3 by user 1
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[2].id}/like-status`)
      .set('Authorization', `Bearer ${users[0].accessToken}`)
      .send({ likeStatus: 'Dislike' });

    // Like post 4 by user 1, user 4, user 2, user 3
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[3].id}/like-status`)
      .set('Authorization', `Bearer ${users[0].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[3].id}/like-status`)
      .set('Authorization', `Bearer ${users[3].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[3].id}/like-status`)
      .set('Authorization', `Bearer ${users[1].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[3].id}/like-status`)
      .set('Authorization', `Bearer ${users[2].accessToken}`)
      .send({ likeStatus: 'Like' });

    // Like post 5 by user 2, dislike by user 3
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[4].id}/like-status`)
      .set('Authorization', `Bearer ${users[1].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[4].id}/like-status`)
      .set('Authorization', `Bearer ${users[2].accessToken}`)
      .send({ likeStatus: 'Dislike' });

    // Like post 6 by user 1, dislike by user 2
    await request(app.getHttpServer())
      .put(`/api/posts/${posts[5].id}/like-status`)
      .set('Authorization', `Bearer ${users[0].accessToken}`)
      .send({ likeStatus: 'Like' });

    await request(app.getHttpServer())
      .put(`/api/posts/${posts[5].id}/like-status`)
      .set('Authorization', `Bearer ${users[1].accessToken}`)
      .send({ likeStatus: 'Dislike' });

    // Get posts as user 1 with fresh token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: 'user1',
        password: 'password123',
      });

    const user1AccessToken = loginResponse.body.accessToken;

    // Get posts with the authenticated user's token
    const response = await request(app.getHttpServer())
      .get(`/api/blogs/${blogId}/posts`)
      .set('Authorization', `Bearer ${user1AccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(response.body.items).toHaveLength(6);

    // Verify post 1 likes
    const post1 = response.body.items.find((p: any) => p.id === posts[0].id);
    expect(post1.extendedLikesInfo.likesCount).toBe(2);
    expect(post1.extendedLikesInfo.myStatus).toBe('Like');
    expect(post1.extendedLikesInfo.newestLikes).toHaveLength(2);

    // Verify post 2 likes
    const post2 = response.body.items.find((p: any) => p.id === posts[1].id);
    expect(post2.extendedLikesInfo.likesCount).toBe(2);
    expect(post2.extendedLikesInfo.myStatus).toBe('None');
    expect(post2.extendedLikesInfo.newestLikes).toHaveLength(2);

    // Verify post 3 dislikes
    const post3 = response.body.items.find((p: any) => p.id === posts[2].id);
    expect(post3.extendedLikesInfo.dislikesCount).toBe(1);
    expect(post3.extendedLikesInfo.myStatus).toBe('Dislike');
    expect(post3.extendedLikesInfo.newestLikes).toHaveLength(0);

    // Verify post 4 likes (4 likes)
    const post4 = response.body.items.find((p: any) => p.id === posts[3].id);
    expect(post4.extendedLikesInfo.likesCount).toBe(4);
    expect(post4.extendedLikesInfo.myStatus).toBe('Like');
    expect(post4.extendedLikesInfo.newestLikes).toHaveLength(3);

    // Verify post 5 likes/dislikes
    const post5 = response.body.items.find((p: any) => p.id === posts[4].id);
    expect(post5.extendedLikesInfo.likesCount).toBe(1);
    expect(post5.extendedLikesInfo.dislikesCount).toBe(1);
    expect(post5.extendedLikesInfo.myStatus).toBe('None');
    expect(post5.extendedLikesInfo.newestLikes).toHaveLength(1);

    // Verify post 6 likes/dislikes
    const post6 = response.body.items.find((p: any) => p.id === posts[5].id);
    expect(post6.extendedLikesInfo.likesCount).toBe(1);
    expect(post6.extendedLikesInfo.dislikesCount).toBe(1);
    expect(post6.extendedLikesInfo.myStatus).toBe('Like');
    expect(post6.extendedLikesInfo.newestLikes).toHaveLength(1);

    // Verify newestLikes are sorted by addedAt in descending order
    const newestLikes = post4.extendedLikesInfo.newestLikes;
    for (let i = 0; i < newestLikes.length - 1; i++) {
      const current = new Date(newestLikes[i].addedAt).getTime();
      const next = new Date(newestLikes[i + 1].addedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});
