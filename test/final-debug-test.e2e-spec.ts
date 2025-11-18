// test/final-debug-test.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Final Debug Test (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let validPostId: string;

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

        validPostId = postResponse.body.id;
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

    // Test the exact scenario that was reported
    it('should return 200 for GET /posts/:postId/comments with valid post and no comments', async () => {
        const response = await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments`)
            .expect(200);

        expect(response.body).toEqual({
            pagesCount: 0,
            page: 1,
            pageSize: 10,
            totalCount: 0,
            items: []
        });
    });

    // Test with various query parameters
    it('should return 200 for GET /posts/:postId/comments with various query params', async () => {
        await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments?pageNumber=1`)
            .expect(200);

        await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments?pageSize=5`)
            .expect(200);

        await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments?sortBy=createdAt`)
            .expect(200);

        await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments?sortDirection=ASC`)
            .expect(200);

        await request(app.getHttpServer())
            .get(`/api/posts/${validPostId}/comments?pageNumber=1&pageSize=5&sortBy=createdAt&sortDirection=ASC`)
            .expect(200);
    });

    // Test error cases
    it('should return 404 for non-existent post ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        await request(app.getHttpServer())
            .get(`/api/posts/${nonExistentId}/comments`)
            .expect(404);
    });

    it('should return 400 for invalid post ID format', async () => {
        const invalidId = 'invalid-id';
        await request(app.getHttpServer())
            .get(`/api/posts/${invalidId}/comments`)
            .expect(400);
    });
});