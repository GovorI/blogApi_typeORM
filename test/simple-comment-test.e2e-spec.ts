// test/simple-comment-test.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Simple Comment Creation Test (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let testUser: { id: string; accessToken: string };
    let testPost: { id: string };

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

        // Create a test user
        const userResponse = await request(app.getHttpServer())
            .post('/api/sa/users')
            .auth('admin', 'qwerty', { type: 'basic' })
            .send({
                login: 'testuser',
                password: 'password123',
                email: 'test@example.com',
            })
            .expect(201);

        const loginResponse = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                loginOrEmail: 'testuser',
                password: 'password123',
            })
            .expect(200);

        testUser = {
            id: userResponse.body.id,
            accessToken: loginResponse.body.accessToken,
        };

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

        testPost = {
            id: postResponse.body.id,
        };
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

    it('should create a comment successfully', async () => {
        const commentContent = 'This is a test comment with more than 20 characters to meet validation requirements';

        const response = await request(app.getHttpServer())
            .post(`/api/posts/${testPost.id}/comments`)
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                content: commentContent
            })
            .expect(201);

        // Check the basic structure
        expect(response.body.id).toBeDefined();
        expect(response.body.content).toBe(commentContent);
        expect(response.body.commentatorInfo.userId).toBe(testUser.id);
        expect(response.body.commentatorInfo.userLogin).toBe('testuser');
        expect(response.body.likesInfo.likesCount).toBe(0);
        expect(response.body.likesInfo.dislikesCount).toBe(0);
        expect(response.body.likesInfo.myStatus).toBe('None');
        expect(response.body.createdAt).toBeDefined();
    }, 10000); // Increase timeout for test

    it('should reject comment with content less than 20 characters', async () => {
        const shortContent = 'Too short';

        await request(app.getHttpServer())
            .post(`/api/posts/${testPost.id}/comments`)
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                content: shortContent
            })
            .expect(400);
    }, 10000);

    it('should reject comment with content more than 300 characters', async () => {
        const longContent = 'A'.repeat(301);

        await request(app.getHttpServer())
            .post(`/api/posts/${testPost.id}/comments`)
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({
                content: longContent
            })
            .expect(400);
    }, 10000);
});