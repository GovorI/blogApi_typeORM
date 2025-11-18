import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('Simple Auth Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    appSetup(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test JWT token verification', async () => {
    // Clear all data first
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(204);

    // Register a user
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({
        login: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(204);

    console.log('Registration successful');

    // Try to login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: 'testuser',
        password: 'password123',
      });

    console.log('Login status:', loginResponse.status);
    console.log('Login response body:', loginResponse.body);
    console.log('Login response headers:', loginResponse.headers);

    // Test token verification by calling /auth/me
    if (loginResponse.status === 200 && loginResponse.body.accessToken) {
      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

      console.log('Me response status:', meResponse.status);
      console.log('Me response body:', meResponse.body);
    }
  });
});
