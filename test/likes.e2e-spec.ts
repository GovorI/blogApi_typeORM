import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestingController } from '../src/modules/testing/testing.controller';
import { appSetup } from '../src/setup/app.setup';
import { PostViewDto } from '../src/modules/blogers-platform/api/view-dto/post.view-dto';

describe('Posts Likes (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdBlogId: string;
  let createdPostId: string;

  beforeAll(async () => {
    // Set environment variables for testing
    process.env.NODE_ENV = 'testing';
    process.env.IS_USER_AUTOMATICALLY_CONFIRMED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    appSetup(app);
    await app.init();

    const testingController = app.get(TestingController);
    console.log('TestingController loaded:', !!testingController);

    // Clear database
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(204);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a user, create blog and post, then like the post', async () => {
    // 1. Register a user
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({
        login: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      });
    console.log('Registration response status:', registerResponse.status);
    expect(registerResponse.status).toBe(204);

    // 2. Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: 'testuser',
        password: 'password123',
      });
    console.log('Login response status:', loginResponse.status);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('accessToken');

    const authToken = loginResponse.body.accessToken as string;
    console.log('Auth token received');

    // 3. Create a blog (using basic auth)
    const blogResponse = await request(app.getHttpServer())
      .post('/api/sa/blogs')
      .auth('admin', 'qwerty')
      .send({
        name: 'Test Blog',
        description: 'A test blog',
        websiteUrl: 'https://example.com',
      });
    console.log('Create blog response:', blogResponse.body);
    expect(blogResponse.status).toBe(201);
    expect(blogResponse.body).toHaveProperty('id');

    const createdBlogId = blogResponse.body.id as string;
    console.log('Created blog with ID:', createdBlogId);

    // 4. Create a post
    const postResponse = await request(app.getHttpServer())
      .post('/api/posts')
      .auth('admin', 'qwerty')
      .send({
        title: 'Test Post',
        shortDescription: 'A test post',
        content: 'This is test content',
        blogId: createdBlogId,
      });
    console.log('Create post response:', postResponse.body);
    expect(postResponse.status).toBe(201);
    expect(postResponse.body).toHaveProperty('id');

    const createdPostId = postResponse.body.id as string;
    console.log('Created post with ID:', createdPostId);

    // 5. Get the post before liking (should have 0 likes)
    const postBeforeLike = await request(app.getHttpServer())
      .get(`/api/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${authToken}`);
    console.log('Post before like:', postBeforeLike.body);
    expect(postBeforeLike.status).toBe(200);
    expect(
      (postBeforeLike.body as PostViewDto).extendedLikesInfo.likesCount,
    ).toBe(0);
    expect(
      (postBeforeLike.body as PostViewDto).extendedLikesInfo.dislikesCount,
    ).toBe(0);
    expect(
      (postBeforeLike.body as PostViewDto).extendedLikesInfo.myStatus,
    ).toBe('None');
    expect(
      (postBeforeLike.body as PostViewDto).extendedLikesInfo.newestLikes,
    ).toEqual([]);

    // 6. Like the post
    const likeResponse = await request(app.getHttpServer())
      .put(`/api/posts/${createdPostId}/like-status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        likeStatus: 'Like',
      });
    console.log('Like response status:', likeResponse.status);
    expect(likeResponse.status).toBe(204);

    // Добавляем небольшую задержку для обработки
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 7. Get the post after liking (should have 1 like)
    const postAfterLike = await request(app.getHttpServer())
      .get(`/api/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${authToken}`);
    console.log(
      'Post after like:',
      JSON.stringify(postAfterLike.body, null, 2),
    );
    expect(postAfterLike.status).toBe(200);
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.likesCount,
    ).toBe(1);
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.dislikesCount,
    ).toBe(0);
    expect((postAfterLike.body as PostViewDto).extendedLikesInfo.myStatus).toBe(
      'Like',
    );
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.newestLikes,
    ).toHaveLength(1);
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.newestLikes[0]
        .login,
    ).toBe('testuser');
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.newestLikes[0]
        .userId,
    ).toBeDefined();
    expect(
      (postAfterLike.body as PostViewDto).extendedLikesInfo.newestLikes[0]
        .addedAt,
    ).toBeDefined();
  });
});
