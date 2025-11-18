import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should login successfully with valid credentials (if user exists)', async () => {
      // First, register a user for testing
      await request(app.getHttpServer()).post('/api/auth/registration').send({
        login: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      // Try to login
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser',
          password: 'password123',
        })
        .expect(200);

      // Check that response contains accessToken
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Check that refreshToken cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieArray.find((cookie: string) =>
        cookie.startsWith('refreshToken='),
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      // expect(refreshTokenCookie).toContain('Secure');
    });
  });
});
