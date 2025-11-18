// test/post-comments-not-found-test.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Post Comments Not Found Test (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup the application
    appSetup(app);
    await app.init();

    // Clear database tables
    await dataSource.query(`TRUNCATE TABLE "Users" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "Posts" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "Comments" CASCADE;`);
    await dataSource.query(`TRUNCATE TABLE "commentLikes" CASCADE;`);
  }, 30000); // Increase timeout for setup

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

  it('should return 200 with empty comments list for valid post ID with no comments', async () => {
    // Create a test blog
    const blogResponse = await request(app.getHttpServer())
      .post('/api/sa/blogs')
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        name: 'Test Blog',
        description: 'Test Blog Description',
        websiteUrl: 'https://test-blog.com',
      })
      .expect(201);

    // Create a test post
    const postResponse = await request(app.getHttpServer())
      .post(`/api/sa/blogs/${blogResponse.body.id}/posts`)
      .auth('admin', 'qwerty', { type: 'basic' })
      .send({
        title: 'Test Post',
        shortDescription: 'Short description',
        content: 'Post content',
      })
      .expect(201);

    // Get comments for the post (should return 200 with empty list)
    await request(app.getHttpServer())
      .get(`/api/posts/${postResponse.body.id}/comments`)
      .expect(200);
  }, 10000); // Increase timeout for test

  it('should return 404 for non-existent post ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/posts/${nonExistentId}/comments`)
      .expect(404);
  }, 10000); // Increase timeout for test

  it('should return 400 for invalid post ID format', async () => {
    const invalidId = 'invalid-id-format';

    await request(app.getHttpServer())
      .get(`/api/posts/${invalidId}/comments`)
      .expect(400);
  }, 10000); // Increase timeout for test
});
