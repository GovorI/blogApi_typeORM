import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';
import { AppDataSource } from '../src/db/data-source';
import { initAppAndListen } from './helpers/e2e-app';
import { clearDb } from './helpers/e2e-db';

const logger = new Logger('QuizQuestionsE2E');

// Функция для ожидания доступности базы данных
const waitForDatabase = async (
  maxAttempts = 10,
  delay = 1000,
): Promise<void> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const dataSource = new DataSource({
        ...AppDataSource.options,
        logging: ['error'],
      });
      await dataSource.initialize();
      await dataSource.destroy();
      logger.log('Database connection established successfully');
      return;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        logger.error(
          `Failed to connect to database after ${maxAttempts} attempts`,
          error,
        );
        throw error;
      }
      logger.warn(
        `Database connection attempt ${attempts} failed, retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

describe('Quiz Questions SA (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const adminCredentials = { username: 'admin', password: 'qwerty' };

  const createQuestionDto = (body: string) => ({
    body,
    correctAnswers: ['answer 1', 'answer 2'],
  });

  beforeAll(async () => {
    try {
      // Ждем пока база данных станет доступна
      await waitForDatabase();

      // Инициализируем тестовый модуль
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      dataSource = moduleFixture.get<DataSource>(DataSource);

      // Настраиваем приложение
      appSetup(app);

      await initAppAndListen(app);

      // Запускаем миграции
      try {
        await dataSource.runMigrations({ transaction: 'all' });
        logger.log('Migrations applied successfully');
      } catch (migrationError) {
        logger.warn(
          'Failed to run migrations, trying to continue',
          migrationError,
        );
      }
    } catch (error) {
      logger.error('Error during test setup', error);
      throw error;
    }
  });

  // Очищаем таблицу перед каждым тестом
  beforeEach(async () => {
    await clearDb(app);
  });

  afterAll(async () => {
    try {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
      }
      if (app) {
        await app.close();
      }
    } catch (error) {
      logger.error('Error during test teardown', error);
    }
  });

  describe('Auth', () => {
    it('GET /sa/quiz/questions should return 401 without basic auth', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/quiz/questions')
        .expect(401);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path', '/api/sa/quiz/questions');
    });

    it('POST /sa/quiz/questions should return 401 without basic auth', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .send(createQuestionDto('Question body long enough'))
        .expect(401);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path', '/api/sa/quiz/questions');
    });
  });

  describe('CRUD', () => {
    it('POST /sa/quiz/questions should create a question', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(createQuestionDto(`First question ${Date.now()}`))
        .expect(201);

      expect(createRes.body).toHaveProperty('id');
      expect(createRes.body).toHaveProperty('body');
      expect(createRes.body).toHaveProperty('correctAnswers');
      expect(createRes.body).toHaveProperty('published');
      expect(createRes.body).toHaveProperty('createdAt');
      expect(createRes.body).toHaveProperty('updatedAt');

      expect(createRes.body.published).toBe(false);
      expect(Array.isArray(createRes.body.correctAnswers)).toBe(true);
      expect(createRes.body.updatedAt).toBeNull();
    });

    it('POST /sa/quiz/questions should return 400 for invalid dto', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          body: 'short',
          correctAnswers: [],
        })
        .expect(400);

      expect(res.body).toHaveProperty('errorsMessages');
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it('GET /sa/quiz/questions should return paginated list', async () => {
      const createdIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const createRes = await request(app.getHttpServer())
          .post('/api/sa/quiz/questions')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send(createQuestionDto(`Question number ${i} ${Date.now()}`))
          .expect(201);
        createdIds.push(createRes.body.id);
      }

      const res = await request(app.getHttpServer())
        .get('/api/sa/quiz/questions?pageNumber=1&pageSize=10')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(200);

      expect(res.body).toHaveProperty('pagesCount');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('items');

      expect(res.body.totalCount).toBe(3);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(3);

      const returnedIds = res.body.items.map((i: any) => i.id);
      for (const id of createdIds) {
        expect(returnedIds).toContain(id);
      }
    });

    it('PUT /sa/quiz/questions/:id should update question', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(createQuestionDto(`Original body ${Date.now()}`))
        .expect(201);

      const id = createRes.body.id;
      const updatedBody = `Updated body ${Date.now()}`;

      await request(app.getHttpServer())
        .put(`/api/sa/quiz/questions/${id}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          body: updatedBody,
          correctAnswers: ['new answer'],
        })
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get(
          `/api/sa/quiz/questions?bodySearchTerm=${encodeURIComponent(updatedBody)}`,
        )
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(200);

      expect(listRes.body.totalCount).toBe(1);
      expect(listRes.body.items[0].id).toBe(id);
      expect(listRes.body.items[0].body).toBe(updatedBody);
      expect(listRes.body.items[0].correctAnswers).toEqual(['new answer']);
    });

    it('PUT /sa/quiz/questions/:id/publish should publish and filter should work', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(createQuestionDto(`Publish test ${Date.now()}`))
        .expect(201);

      const id = createRes.body.id;

      await request(app.getHttpServer())
        .put(`/api/sa/quiz/questions/${id}/publish`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({ published: true })
        .expect(204);

      const publishedRes = await request(app.getHttpServer())
        .get('/api/sa/quiz/questions?publishedStatus=published')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(200);

      const notPublishedRes = await request(app.getHttpServer())
        .get('/api/sa/quiz/questions?publishedStatus=notPublished')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(200);

      const publishedIds = publishedRes.body.items.map((i: any) => i.id);
      expect(publishedIds).toContain(id);

      const notPublishedIds = notPublishedRes.body.items.map((i: any) => i.id);
      expect(notPublishedIds).not.toContain(id);
    });

    it('PUT /sa/quiz/questions/:id/publish should return 400 if body is incorrect', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(createQuestionDto(`Publish validation test ${Date.now()}`))
        .expect(201);

      const id = createRes.body.id;

      const res = await request(app.getHttpServer())
        .put(`/api/sa/quiz/questions/${id}/publish`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({ published: 'true' })
        .expect(400);

      expect(res.body).toHaveProperty('errorsMessages');
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
      expect(res.body.errorsMessages.length).toBeGreaterThan(0);
      expect(res.body.errorsMessages[0]).toHaveProperty('message');
      expect(res.body.errorsMessages[0]).toHaveProperty('field', 'published');
    });

    it('DELETE /sa/quiz/questions/:id should soft-delete question (not returned in list)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/sa/quiz/questions')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(createQuestionDto(`Delete test ${Date.now()}`))
        .expect(201);

      const id = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/sa/quiz/questions/${id}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get('/api/sa/quiz/questions?pageNumber=1&pageSize=10')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(200);

      const returnedIds = listRes.body.items.map((i: any) => i.id);
      expect(returnedIds).not.toContain(id);
    });

    it('should return 404 for operations with non-existent UUID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .put(`/api/sa/quiz/questions/${nonExistentId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({ body: 'Some valid body text', correctAnswers: ['a'] })
        .expect(404);

      await request(app.getHttpServer())
        .put(`/api/sa/quiz/questions/${nonExistentId}/publish`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({ published: true })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/sa/quiz/questions/${nonExistentId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(404);
    });
  });
});
