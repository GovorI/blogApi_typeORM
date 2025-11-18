import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('UserController (e2e) - Debug', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    appSetup(app);
    await app.init();

    // Очищаем базу данных перед запуском всех тестов
    try {
      await request(app.getHttpServer())
        .delete('/testing/all-data')
        .expect(204);
      console.log('✅ Database cleanup successful');
    } catch (error) {
      console.log('❌ Database cleanup failed:', error.message);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // Вспомогательная функция для аутентификации
  const authHeader = Buffer.from('admin:qwerty').toString('base64');

  it.skip('должен проверить доступность эндпоинта очистки базы данных', async () => {
    const response = await request(app.getHttpServer())
      .delete('/testing/all-data')
      .expect(204);

    console.log('✅ Testing endpoint is available');
  });

  it('должен проверить аутентификацию Basic Auth', async () => {
    const response = await request(app.getHttpServer())
      .post('/sa/users')
      .set('Authorization', `Basic ${authHeader}`)
      .send({
        login: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);

    if (response.status === 201) {
      console.log('✅ User creation successful');
    } else {
      console.log('❌ User creation failed');
    }
  });
});
