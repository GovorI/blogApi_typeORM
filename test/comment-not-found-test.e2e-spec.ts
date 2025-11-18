// test/comment-not-found-test.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Comment Not Found Test (e2e)', () => {
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

    it('should return 404 for non-existent comment ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        await request(app.getHttpServer())
            .get(`/api/comments/${nonExistentId}`)
            .expect(404);
    }, 10000); // Increase timeout for test

    it('should return 400 for invalid comment ID format', async () => {
        const invalidId = 'invalid-id-format';

        await request(app.getHttpServer())
            .get(`/api/comments/${invalidId}`)
            .expect(400);
    }, 10000); // Increase timeout for test
});