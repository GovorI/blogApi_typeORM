import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('Refresh Token Cookie Tests (e2e)', () => {
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

  it('should return new refresh and access tokens with proper cookie settings', async () => {
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

    console.log('Login response headers:', loginResponse.headers);

    const cookies = loginResponse.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    const refreshTokenCookie = cookieArray.find((cookie: string) =>
      cookie.startsWith('refreshToken='),
    );
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toContain('HttpOnly');
    expect(refreshTokenCookie).toContain('SameSite=Strict');
    // In testing environment, Secure should not be present
    expect(refreshTokenCookie).not.toContain('Secure');
    console.log('Original refresh token cookie:', refreshTokenCookie);

    // Wait a moment to ensure we get new tokens
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Call refresh token endpoint
    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('Cookie', cookies)
      .expect(200);

    console.log('Refresh response headers:', refreshResponse.headers);
    console.log('Refresh response body:', refreshResponse.body);

    // Check that response contains new accessToken
    expect(refreshResponse.body).toHaveProperty('accessToken');
    expect(typeof refreshResponse.body.accessToken).toBe('string');

    // Check that new refreshToken cookie is set
    const newCookies = refreshResponse.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    console.log('New cookies:', newCookies);

    const newCookieArray = Array.isArray(newCookies)
      ? newCookies
      : [newCookies];
    const newRefreshTokenCookie = newCookieArray.find((cookie: string) =>
      cookie.startsWith('refreshToken='),
    );

    expect(newRefreshTokenCookie).toBeDefined();
    expect(newRefreshTokenCookie).toContain('HttpOnly');
    expect(newRefreshTokenCookie).toContain('SameSite=Strict');
    // In testing environment, Secure should not be present
    expect(newRefreshTokenCookie).not.toContain('Secure');

    console.log('New refresh token cookie:', newRefreshTokenCookie);

    // Verify that the new refresh token is different from the old one
    const oldToken = refreshTokenCookie?.split('=')[1]?.split(';')[0];
    const newToken = newRefreshTokenCookie?.split('=')[1]?.split(';')[0];

    expect(oldToken).toBeDefined();
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    console.log('Token rotation verified: old token !== new token');
  });
});
