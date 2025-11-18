import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { appSetup } from '../src/setup/app.setup';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let cookies: string[];
  let refreshToken: string;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Register and login user
    await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({
        login: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(204);

    // небольшая пауза, чтобы не попасть в rate limiter при последующем входе
    await sleep(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: 'testuser',
        password: 'password123',
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
    cookies = Array.isArray(loginResponse.headers['set-cookie'])
      ? loginResponse.headers['set-cookie']
      : [loginResponse.headers['set-cookie']];

    // Extract refresh token from cookies
    const refreshTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('refreshToken='),
    );
    if (refreshTokenCookie) {
      refreshToken = refreshTokenCookie.split('=')[1].split(';')[0];
    }
  });

  describe('GET /security/devices', () => {
    it('should return list of active sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check session structure
      const session = response.body[0];
      expect(session).toHaveProperty('ip');
      expect(session).toHaveProperty('title');
      expect(session).toHaveProperty('lastActiveDate');
      expect(session).toHaveProperty('deviceId');
    });

    it('should return 401 when no authorization header provided', async () => {
      await request(app.getHttpServer())
        .get('/api/security/devices')
        .expect(401);
    });

    it('should work with refresh token in cookies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Cookie', cookies)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return device list after multiple logins from different browsers', async () => {
      // Create multiple sessions by logging in multiple times
      const sessions: { accessToken: string; cookies: string[] }[] = [];

      for (let i = 0; i < 3; i++) {
        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .set('User-Agent', `Browser-${i}`)
          .send({
            loginOrEmail: 'testuser',
            password: 'password123',
          })
          .expect(200);

        sessions.push({
          accessToken: loginResponse.body.accessToken,
          cookies: Array.isArray(loginResponse.headers['set-cookie'])
            ? loginResponse.headers['set-cookie']
            : [loginResponse.headers['set-cookie']],
        });

        // небольшая пауза между логинами, чтобы не превысить лимиты
        await sleep(300);
      }

      // Get device list - should show all sessions
      const response = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${sessions[0].accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(4); // Original session + 3 new ones
    });
  });

  describe('DELETE /security/devices', () => {
    it('should terminate all other sessions', async () => {
      await request(app.getHttpServer())
        .delete('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('should return 401 with incorrect auth credentials', async () => {
      await request(app.getHttpServer())
        .delete('/api/security/devices')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('DELETE /security/devices/:deviceId', () => {
    let otherDeviceId: string;
    let otherAccessToken: string;
    let otherCookies: string[];

    beforeEach(async () => {
      // Create another session to test device-specific deletion
      // небольшая пауза перед дополнительным логином, чтобы не триггерить rate limiter
      await sleep(300);
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'Another Browser')
        .send({
          loginOrEmail: 'testuser',
          password: 'password123',
        })
        .expect(200);

      // пауза после логина, чтобы окно rate limiter стабилизировалось
      await sleep(300);

      otherAccessToken = loginResponse.body.accessToken;
      otherCookies = Array.isArray(loginResponse.headers['set-cookie'])
        ? loginResponse.headers['set-cookie']
        : [loginResponse.headers['set-cookie']];

      // Get the device list to find device IDs
      const devicesResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find the device that was just created (the "Another Browser" session)
      // This will be the one we want to delete using the original access token
      const devices = devicesResponse.body;
      expect(devices.length).toBeGreaterThan(1);

      // Find the device with title "Another Browser" - this is what we'll delete
      const otherDevice = devices.find(
        (d: any) => d.title === 'Another Browser',
      );
      expect(otherDevice).toBeDefined();
      otherDeviceId = otherDevice.deviceId;
    });

    it('should delete device from device list by deviceId', async () => {
      // Delete the other device using the original access token
      await request(app.getHttpServer())
        .delete(`/api/security/devices/${otherDeviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify device was removed
      const response = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deviceIds = response.body.map((device: any) => device.deviceId);
      expect(deviceIds).not.toContain(otherDeviceId);
    });

    it('should return 404 if device ID not found', async () => {
      await request(app.getHttpServer())
        .delete('/api/security/devices/non-existent-device-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 403 when trying to delete current session', async () => {
      // Get device list for the "Another Browser" session
      const devicesResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      // Find the device that corresponds to the "Another Browser" session
      const currentDevice = devicesResponse.body.find(
        (d: any) => d.title === 'Another Browser',
      );
      expect(currentDevice).toBeDefined();
      const currentDeviceId = currentDevice.deviceId;

      // Use the "Another Browser" access token to try to delete its own session
      await sleep(300);
      await request(app.getHttpServer())
        .delete(`/api/security/devices/${currentDeviceId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    sleep(500)
    it('should return 401 with incorrect auth credentials', async () => {
      await request(app.getHttpServer())
        .delete(`/api/security/devices/${otherDeviceId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    sleep(500)
    it('should return 403 when trying to delete session from different user', async () => {
      // Create another user
      await sleep(300);
      await request(app.getHttpServer())
        .post('/api/auth/registration')
        .send({
          login: 'testuser2',
          email: 'test2@example.com',
          password: 'password123',
        })
        .expect(204);

      await sleep(300);
      const user2LoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'testuser2',
          password: 'password123',
        })
        .expect(200);

      await sleep(300);

      // Try to delete user1's device using user2's token
      await request(app.getHttpServer())
        .delete(`/api/security/devices/${otherDeviceId}`)
        .set('Authorization', `Bearer ${user2LoginResponse.body.accessToken}`)
        .expect(403); // Should be 403 because the device belongs to another user
    });
  });

  describe('Refresh Token Integration', () => {
    it('should not change device id after /auth/refresh-token but lastActiveDate should change', async () => {
      // Get initial device list
      const initialResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const initialDevice = initialResponse.body[0];
      const initialLastActive = initialDevice.lastActiveDate;

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Call refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .set('Cookie', cookies)
        .expect(200);

      // Get device list again
      const updatedResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      const updatedDevice = updatedResponse.body[0];

      // Device ID should remain the same
      expect(updatedDevice.deviceId).toBe(initialDevice.deviceId);

      // LastActiveDate should be updated
      expect(new Date(updatedDevice.lastActiveDate).getTime()).toBeGreaterThan(
        new Date(initialLastActive).getTime(),
      );
    });

    it('should work with both access token and refresh token', async () => {
      // Test with access token
      const accessTokenResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Test with refresh token in cookies
      const refreshTokenResponse = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Cookie', cookies)
        .expect(200);

      // Both should return the same data
      expect(accessTokenResponse.body).toEqual(refreshTokenResponse.body);
    });
  });

  describe('Session cleanup after logout', () => {
    it('should return device list without logged out device', async () => {
      // Create additional session
      const additionalLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('User-Agent', 'Additional Browser')
        .send({
          loginOrEmail: 'testuser',
          password: 'password123',
        })
        .expect(200);

      // защитная пауза, чтобы не зацепить rate limiter
      await sleep(300);

      // Verify we have multiple sessions
      const beforeLogout = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(beforeLogout.body.length).toBeGreaterThan(1);

      // Logout the additional session
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', additionalLogin.headers['set-cookie'])
        .expect(204);

      // Check devices list - should have one less device
      const afterLogout = await request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(afterLogout.body.length).toBe(beforeLogout.body.length - 1);
    });
  });
});
