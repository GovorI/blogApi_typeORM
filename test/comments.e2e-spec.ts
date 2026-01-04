// test/comments.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';
import { initAppAndListen } from './helpers/e2e-app';
import { clearDb } from './helpers/e2e-db';

describe('CommentsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: { id: string; accessToken: string };
  let testComment: { id: string; postId: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Настраиваем приложение
    appSetup(app);
    await initAppAndListen(app);

    await clearDb(app);

    // Создаем тестового пользователя
    const userResponse = await request(app.getHttpServer())
      .post('/api/sa/users')
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        login: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: 'testuser',
        password: 'password123',
      })
      .expect(200);

    testUser = {
      id: userResponse.body.id,
      accessToken: loginResponse.body.accessToken,
    };

    // Создаем тестовый блог с использованием Basic Auth
    const blogResponse = await request(app.getHttpServer())
      .post('/api/sa/blogs')
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        name: 'Test Blog',
        description: 'Test Blog Description',
        websiteUrl: 'https://test-blog.com',
      })
      .expect(201);

    // Создаем тестовый пост
    const postResponse = await request(app.getHttpServer())
      .post(`/api/sa/blogs/${blogResponse.body.id}/posts`)
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        title: 'Test Post',
        shortDescription: 'Short description',
        content: 'Post content',
      })
      .expect(201);

    // Проверяем, что пост создан и имеет ID
    if (!postResponse.body.id) {
      throw new Error('Post was not created or does not have an ID');
    }
    console.log('Created post with ID:', postResponse.body.id);

    // Создаем тестовый комментарий
    const commentResponse = await request(app.getHttpServer())
      .post(`/api/posts/${postResponse.body.id}/comments`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        content: 'This is a test comment with more than 20 characters'
      });

    if (commentResponse.status !== 201) {
      throw new Error(
        `Failed to create comment: ${JSON.stringify(commentResponse.body)}`,
      );
    }

    testComment = {
      id: commentResponse.body.id,
      postId: postResponse.body.id,
    };
  });

  afterAll(async () => {
    try {
      // Ensure all database operations are complete before closing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Disconnect from the database
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }

      // Close the app
      if (app) {
        await app.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  });

  describe('GET /comments/:id', () => {
    it('should return 200 and comment data for existing comment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testComment.id,
        content: 'This is a test comment with more than 20 characters',
        commentatorInfo: {
          userId: testUser.id,
          userLogin: 'testuser',
        },
        likesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: 'None',
        },
      });
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/comments/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid comment ID format', async () => {
      await request(app.getHttpServer())
        .get('/api/comments/invalid-id-format')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(400);
    });

    it('should return correct like status for authenticated user', async () => {
      // Лайкаем комментарий
      await request(app.getHttpServer())
        .put(`/api/comments/${testComment.id}/like-status`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ likeStatus: 'Like' })
        .expect(204);

      // Получаем комментарий и проверяем статус лайка
      const response = await request(app.getHttpServer())
        .get(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.likesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 0,
        myStatus: 'Like',
      });
    });

    it('should return None as like status for unauthenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/comments/${testComment.id}`)
        .expect(200);

      expect(response.body.likesInfo.myStatus).toBe('None');
    });

    it('should return correct like counts', async () => {
      // ARRANGE: Убедимся, что первый пользователь поставил лайк
      await request(app.getHttpServer())
        .put(`/api/comments/${testComment.id}/like-status`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ likeStatus: 'Like' })
        .expect(204);

      // Создаем второго пользователя
      await request(app.getHttpServer())
        .post('/api/sa/users')
        .auth('admin', 'qwerty', { type: 'basic' })
        .send({
          login: 'testuser2',
          password: 'password123',
          email: 'test2@example.com',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser2',
          password: 'password123',
        })
        .expect(200);

      const user2Token = loginResponse.body.accessToken;

      // Второй пользователь ставит дизлайк
      await request(app.getHttpServer())
        .put(`/api/comments/${testComment.id}/like-status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ likeStatus: 'Dislike' })
        .expect(204);

      // Получаем комментарий и проверяем количество лайков/дизлайков
      const response = await request(app.getHttpServer())
        .get(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.likesInfo).toEqual({
        likesCount: 1, // От первого пользователя
        dislikesCount: 1, // От второго пользователя
        myStatus: 'Like', // Текущий пользователь (testUser) поставил лайк
      });
    });

    it('should return 404 for deleted comment', async () => {
      // Удаляем комментарий
      await request(app.getHttpServer())
        .delete(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(204);

      // Пытаемся получить удаленный комментарий
      await request(app.getHttpServer())
        .get(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });
  });
});
