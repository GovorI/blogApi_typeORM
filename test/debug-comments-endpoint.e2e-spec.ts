// test/debug-comments-endpoint.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Debug Comments Endpoint (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let postId: string;

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

        postId = postResponse.body.id;
    }, 30000);

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

    it('should return 200 for GET /posts/:postId/comments with no query params', async () => {
        const response = await request(app.getHttpServer())
            .get(`/api/posts/${postId}/comments`)
            .expect(200);

        console.log('Response body:', response.body);
    });

    it('should return 200 for GET /posts/:postId/comments with valid query params', async () => {
        const response = await request(app.getHttpServer())
            .get(`/api/posts/${postId}/comments?pageNumber=1&pageSize=10`)
            .expect(200);

        console.log('Response body:', response.body);
    });

    it('should return 200 for GET /posts/:postId/comments with sortBy param', async () => {
        const response = await request(app.getHttpServer())
            .get(`/api/posts/${postId}/comments?sortBy=createdAt`)
            .expect(200);

        console.log('Response body:', response.body);
    });

    it('should return 400 for GET /posts/:postId/comments with invalid sortBy param', async () => {
        const response = await request(app.getHttpServer())
            .get(`/api/posts/${postId}/comments?sortBy=invalidField`)
            .expect(400);

        console.log('Response body:', response.body);
    });
});