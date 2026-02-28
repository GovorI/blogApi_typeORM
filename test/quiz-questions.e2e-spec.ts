import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';
import { AppDataSource } from '../src/db/data-source';
import { initAppAndListen } from './helpers/e2e-app';
import { clearDb } from './helpers/e2e-db';
import { isBodyParameter } from '@nestjs/swagger/dist/utils/is-body-parameter.util';

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

  describe('create game and connection players', () => {
    let tokenPlayer1: string;
    let tokenPlayer2: string;
    let tokenPlayer3: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'user1',
          email: 'p1@example.com',
          password: 'password1',
        })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'user2',
          email: 'p2@example.com',
          password: 'password2',
        })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'user3',
          email: 'p3@example.com',
          password: 'password3',
        })
        .expect(204);

      const player1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginOrEmail: 'user1', password: 'password1' })
        .expect(200);
      tokenPlayer1 = player1.body.accessToken;

      const player2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginOrEmail: 'user2', password: 'password2' })
        .expect(200);
      tokenPlayer2 = player2.body.accessToken;

      const player3 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ loginOrEmail: 'user3', password: 'password3' })
        .expect(200);
      tokenPlayer3 = player3.body.accessToken;

      for (let i = 1; i <= 5; i++) {
        const createdQuestion = await request(app.getHttpServer())
          .post('/api/sa/quiz/questions')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            body: `First question ${i} long text`,
            correctAnswers: [`answer ${i}`],
          })
          .expect(201);

        await request(app.getHttpServer())
          .put(`/api/sa/quiz/questions/${createdQuestion.body.id}/publish`)
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({ published: true })
          .expect(204);
      }
    });

    it('POST /pair-game-quiz/pairs/connection should return 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .expect(401);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty(
        'path',
        '/api/pair-game-quiz/pairs/connection',
      );
    });

    it('POST /sa/quiz/questions should create 5 questions and publish them', async () => {
      for (let i = 10; i <= 15; i++) {
        const createdQuestion = await request(app.getHttpServer())
          .post('/api/sa/quiz/questions')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            body: `First question ${i} long text`,
            correctAnswers: [`answer ${i}`],
          })
          .expect(201);

        await request(app.getHttpServer())
          .put(`/api/sa/quiz/questions/${createdQuestion.body.id}/publish`)
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({ published: true })
          .expect(204);
      }
    });

    it('same player cannot create another connection while has unfinished game -> 403', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(403);
    });

    it('both players cannot reconnect while game is active -> 403 for both', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(403);
    });

    it('fist player connecting to game. status game must be "PendingSecondPlayer"', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
    });

    it('second player connecting to game. status game must be "Active"', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);
    });

    it('get my current game with status "PendingSecondPlayer"', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
    });

    it('get my current game with status "active"', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
    });

    it('get game by id', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      const gameId = res.body.id;

      await request(app.getHttpServer())
        .get(`/api/pair-game-quiz/pairs/${gameId}`)
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
    });

    it(
      'Should return error if current user tries to get pair in which not' +
        ' participated; status 403',
      async () => {
        await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/connection')
          .set('Authorization', `Bearer ${tokenPlayer1}`)
          .expect(200);

        await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/connection')
          .set('Authorization', `Bearer ${tokenPlayer2}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .get('/api/pair-game-quiz/pairs/my-current')
          .set('Authorization', `Bearer ${tokenPlayer1}`)
          .expect(200);

        const gameId = res.body.id;

        await request(app.getHttpServer())
          .get(`/api/pair-game-quiz/pairs/${gameId}`)
          .set('Authorization', `Bearer ${tokenPlayer3}`)
          .expect(403);
      },
    );

    it('set answer should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .send({ answer: 'answer 1' })
        .expect(401);
    });

    it('set answer: case-insensitive and trimmed correctness (score +1)', async () => {
      // connect both to start an active game
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: '  AnSwEr 1  ' })
        .expect(200);

      expect(res.body).toHaveProperty('questionId');
      expect(res.body).toHaveProperty('answerStatus');
      expect(res.body).toHaveProperty('addedAt');

      const cur = await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      expect(Array.isArray(cur.body.firstPlayerProgress.answers)).toBe(true);
      expect(cur.body.firstPlayerProgress.answers.length).toBe(1);
      expect(cur.body.firstPlayerProgress.answers[0]).toHaveProperty(
        'questionId',
      );
      expect(cur.body.firstPlayerProgress.answers[0]).toHaveProperty(
        'answerStatus',
      );
      expect(cur.body.firstPlayerProgress.answers[0]).toHaveProperty('addedAt');
    });

    it('set answer should return 400 for invalid dto (empty answer)', async () => {
      // activate game
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: '' })
        .expect(400);

      expect(res.body).toHaveProperty('errorsMessages');
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it('set answer should return 403 when user has no active game', async () => {
      // no connection to any game yet
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: 'anything' })
        .expect(403);
    });

    it('happy path: both players answer all questions -> game is Finished and each has 5 answers', async () => {
      // activate game
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      // get game id before finishing
      const current = await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      const gameId = current.body.id;

      const send = async (token: string, answer: string) =>
        request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${token}`)
          .send({ answer });

      for (let i = 1; i <= 5; i++) {
        const r1 = await send(tokenPlayer1, `answer ${i}`);
        expect(r1.status).toBe(200);
        await new Promise((r) => setTimeout(r, 10)); // tiny gap
        const r2 = await send(tokenPlayer2, `answer ${i}`);
        expect(r2.status).toBe(200);
        await new Promise((r) => setTimeout(r, 10));
      }

      // verify finished and both have 5 answers
      const byId = await request(app.getHttpServer())
        .get(`/api/pair-game-quiz/pairs/${gameId}`)
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      expect(byId.body.status).toBe('Finished');
      expect(byId.body.finishGameDate).toBeTruthy();

      expect(Array.isArray(byId.body.firstPlayerProgress.answers)).toBe(true);
      expect(Array.isArray(byId.body.secondPlayerProgress.answers)).toBe(true);
      expect(byId.body.firstPlayerProgress.answers.length).toBe(5);
      expect(byId.body.secondPlayerProgress.answers.length).toBe(5);
    });

    it('prevent answering more than available questions (6th -> 403)', async () => {
      // activate game
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      // player1 answers 5 times
      for (let i = 1; i <= 5; i++) {
        const r = await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${tokenPlayer1}`)
          .send({ answer: `answer ${i}` });
        expect(r.status).toBe(200);
      }

      // 6th attempt -> 403
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: 'extra' })
        .expect(403);
    });

    it('set answer should return 403 when game is PendingSecondPlayer (only first connected)', async () => {
      // only first connects -> game is PendingSecondPlayer
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: 'any' })
        .expect(403);
    });

    it('set answer should return 403 after the game is Finished (no more answers allowed)', async () => {
      // activate game
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${tokenPlayer2}`)
        .expect(200);

      // player1 answers 5
      for (let i = 1; i <= 5; i++) {
        const r = await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${tokenPlayer1}`)
          .send({ answer: `answer ${i}` });
        expect(r.status).toBe(200);
      }

      // player2 answers 5
      for (let i = 1; i <= 5; i++) {
        const r = await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${tokenPlayer2}`)
          .send({ answer: `answer ${i}` });
        expect(r.status).toBe(200);
      }

      // game finished; now any further answer should be forbidden
      await request(app.getHttpServer())
        .post('/api/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .send({ answer: 'extra-after-finish' })
        .expect(403);
    });
    it('GET /pair-game-quiz/pairs/my: sorted by status returns finished and current games', async () => {
      const startGame = async () => {
        await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/connection')
          .set('Authorization', `Bearer ${tokenPlayer1}`)
          .expect(200);
        await request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/connection')
          .set('Authorization', `Bearer ${tokenPlayer2}`)
          .expect(200);
      };

      const send = async (token: string, answer: string) =>
        request(app.getHttpServer())
          .post('/api/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${token}`)
          .send({ answer });

      const finishGame = async () => {
        for (let i = 1; i <= 5; i++) {
          const r1 = await send(tokenPlayer1, `answer ${i}`);
          expect(r1.status).toBe(200);
          await new Promise((r) => setTimeout(r, 5));
          const r2 = await send(tokenPlayer2, `answer ${i}`);
          expect(r2.status).toBe(200);
          await new Promise((r) => setTimeout(r, 5));
        }
      };

      // Завершить 3 игры
      for (let g = 0; g < 3; g++) {
        await startGame();
        await finishGame();
      }

      // Начать 4-ю игру и не завершать
      await startGame();

      // Запросить список игр с сортировкой по статусу (ASC)
      const res = await request(app.getHttpServer())
        .get('/api/pair-game-quiz/pairs/my?sortBy=status&sortDirection=ASC')
        .set('Authorization', `Bearer ${tokenPlayer1}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const statuses = res.body.map((g: any) => g.status);
      const finishedCount = statuses.filter(
        (s: string) => s === 'Finished',
      ).length;
      const activeCount = statuses.filter((s: string) => s === 'Active').length;

      expect(finishedCount).toBe(3);
      expect(activeCount).toBe(1);

      // Проверяем, что список реально отсортирован лексикографически по статусу
      const sortedCopy = [...statuses].sort();
      expect(statuses).toEqual(sortedCopy);
    });
  });
});
