import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('Refresh Token Tests (e2e)', () => {
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

  beforeEach(async () => {
    // Clean all data before each test
    await request(app.getHttpServer())
      .delete('/api/testing/all-data')
      .expect(204);
  });

  describe('POST /auth/logout', () => {
    it('should return 401 when refresh token has expired', async () => {
      // Register and login first
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(204);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser',
          password: 'password123',
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Wait for refresh token to expire (should be 20s)
      console.log('Waiting for refresh token to expire...');
      await new Promise((resolve) => setTimeout(resolve, 25000)); // Wait 25 seconds

      // Try to logout with expired token
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(401);

      console.log('Logout with expired token correctly returned 401');
    }, 30000); // 30 second timeout

    it('should return 401 when refresh token becomes invalid after refresh', async () => {
      // Register and login first
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'testuser2',
          email: 'test2@example.com',
          password: 'password123',
        })
        .expect(204);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser2',
          password: 'password123',
        })
        .expect(200);

      const originalCookies = loginResponse.headers['set-cookie'];
      expect(originalCookies).toBeDefined();

      // Refresh token to invalidate the old one
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .set('Cookie', originalCookies)
        .expect(200);

      // Try to logout with the old (now invalid) token
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', originalCookies)
        .expect(401);

      console.log('Logout with invalidated token correctly returned 401');
    });

    it('should return 401 when no refresh token provided', async () => {
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);

      console.log('Logout without refresh token correctly returned 401');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should return 401 when refresh token has expired', async () => {
      // Register and login first
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'testuser3',
          email: 'test3@example.com',
          password: 'password123',
        })
        .expect(204);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser3',
          password: 'password123',
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Wait for refresh token to expire (should be 20s)
      console.log('Waiting for refresh token to expire...');
      await new Promise((resolve) => setTimeout(resolve, 25000)); // Wait 25 seconds

      // Try to refresh with expired token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .set('Cookie', cookies)
        .expect(401);

      console.log('Refresh with expired token correctly returned 401');
    }, 30000); // 30 second timeout
  });
});
