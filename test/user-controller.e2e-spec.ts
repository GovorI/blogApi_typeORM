import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    appSetup(app);
    await app.init();

    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(204);
  });

  afterAll(async () => {
    await app.close();
  });

  // Тестовые данные
  const testUser = {
    login: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  const testUser2 = {
    login: 'testuser2',
    email: 'test2@example.com',
    password: 'password456',
  };

  let createdUserId: string;

  // Вспомогательная функция для аутентификации
  const authHeader = Buffer.from('admin:qwerty').toString('base64');

  describe('POST /sa/users', () => {
    it('должен создать нового пользователя с корректными данными', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sa/users')
        .set('Authorization', `Basic ${authHeader}`)
        .send(testUser)
        .expect(201);

      // Проверяем структуру ответа
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('login', testUser.login);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('createdAt');
      expect(new Date(response.body.createdAt).toString()).not.toBe(
        'Invalid Date',
      );

      // Сохраняем ID для последующих тестов
      createdUserId = response.body.id;
    });

    it('должен вернуть 400 при создании пользователя с невалидными данными', async () => {
      const invalidUser = {
        login: 'ab', // слишком короткий логин (минимум 3 символа)
        email: 'invalid-email',
        password: '123', // слишком короткий пароль (минимум 6 символов)
      };

      await request(app.getHttpServer())
        .post('/api/sa/users')
        .set('Authorization', `Basic ${authHeader}`)
        .send(invalidUser)
        .expect(400);
    });

    it('должен вернуть 401 без аутентификации', async () => {
      await request(app.getHttpServer())
        .post('/api/sa/users')
        .send(testUser2)
        .expect(401);
    });

    it('должен создать второго пользователя', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sa/users')
        .set('Authorization', `Basic ${authHeader}`)
        .send(testUser2)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('login', testUser2.login);
      expect(response.body).toHaveProperty('email', testUser2.email);
    });
  });

  describe.skip('GET /sa/users/:id', () => {
    it('должен вернуть пользователя по корректному ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/sa/users/${createdUserId}`)
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      // Проверяем структуру ответа
      expect(response.body).toHaveProperty('id', createdUserId);
      expect(response.body).toHaveProperty('login', testUser.login);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('должен вернуть 404 для несуществующего ID', async () => {
      await request(app.getHttpServer())
        .get('/api/sa/users/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(404);
    });

    it('должен вернуть 400 для некорректного ID формата', async () => {
      await request(app.getHttpServer())
        .get('/api/sa/users/invalid-id')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(400);
    });
  });

  describe('GET /sa/users', () => {
    it('должен вернуть список всех пользователей с пагинацией по умолчанию', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/users')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      // Проверяем структуру пагинированного ответа
      expect(response.body).toHaveProperty('pagesCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('items');

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);

      // Проверяем структуру первого пользователя в списке
      const firstUser = response.body.items[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('login');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('createdAt');
    });

    it('должен поддерживать поиск по логину', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/users?searchLoginTerm=testuser')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach((user: any) => {
        expect(user.login.toLowerCase()).toContain('testuser');
      });
    });

    it('должен поддерживать поиск по email', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/users?searchEmailTerm=example.com')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach((user: any) => {
        expect(user.email.toLowerCase()).toContain('example.com');
      });
    });

    it('должен поддерживать сортировку по логину', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/users?sortBy=login&sortDirection=asc')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);

      // Проверяем сортировку (предполагаем, что есть как минимум 2 пользователя)
      if (response.body.items.length > 1) {
        const firstLogin = response.body.items[0].login.toLowerCase();
        const secondLogin = response.body.items[1].login.toLowerCase();
        expect(firstLogin <= secondLogin).toBe(true);
      }
    });

    it('должен поддерживать пагинацию', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sa/users?pageSize=1&pageNumber=1')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(200);

      expect(response.body.pageSize).toBe(1);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('DELETE /sa/users/:id', () => {
    it('должен удалить пользователя по корректному ID', async () => {
      // Создаем пользователя для удаления
      const userToDelete = {
        login: 'todelete',
        email: 'delete@example.com',
        password: 'password123',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/users')
        .set('Authorization', `Basic ${authHeader}`)
        .send(userToDelete)
        .expect(201);

      const userIdToDelete = createResponse.body.id;

      // Удаляем пользователя
      await request(app.getHttpServer())
        .delete(`/api/sa/users/${userIdToDelete}`)
        .set('Authorization', `Basic ${authHeader}`)
        .expect(204);

      // Проверяем, что пользователь действительно удален
      await request(app.getHttpServer())
        .get(`/api/sa/users/${userIdToDelete}`)
        .set('Authorization', `Basic ${authHeader}`)
        .expect(404);
    });

    it('должен вернуть 404 при попытке удалить несуществующего пользователя', async () => {
      await request(app.getHttpServer())
        .delete('/api/sa/users/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(404);
    });

    it('должен вернуть 401 без аутентификации', async () => {
      await request(app.getHttpServer())
        .delete(`/api/sa/users/${createdUserId}`)
        .expect(401);
    });

    it('должен вернуть 400 для некорректного ID формата', async () => {
      await request(app.getHttpServer())
        .delete('/api/sa/users/invalid-id')
        .set('Authorization', `Basic ${authHeader}`)
        .expect(400);
    });
  });
});
