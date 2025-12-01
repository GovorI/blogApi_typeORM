import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';

describe('Blogs (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const adminCredentials = { username: 'admin', password: 'qwerty' };
  let authToken: string;
  let createdBlogId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    appSetup(app);
    await app.init();

    // Очистка базы данных перед запуском всех тестов
    await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);

    // Создаем пользователя и получаем токен для авторизации если нужно
    try {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginOrEmail: 'user1',
          password: 'password123',
        });

      if (loginResponse.status === 200) {
        authToken = loginResponse.body.accessToken;
      }
    } catch (error) {
      // Если логин не удался, продолжаем без токена
      console.log(
        'Ошибка авторизации, тесты продолжатся с базовой авторизацией',
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Управление блогами через SA API', () => {
    const testBlog = {
      name: 'Test Blog',
      description: 'This is a test blog description',
      websiteUrl: 'https://test-blog.com',
    };

    const updatedBlog = {
      name: 'Updated Blog',
      description: 'This is an updated blog description',
      websiteUrl: 'https://updated-blog.com',
    };

    it('SA: должен создать новый блог', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const response = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(testBlog)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testBlog.name);
      expect(response.body.description).toBe(testBlog.description);
      expect(response.body.websiteUrl).toBe(testBlog.websiteUrl);
      expect(response.body.isMembership).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      createdBlogId = response.body.id;
    });

    it('SA: должен получить все блоги с пагинацией', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);

      // Создаем несколько блогов для теста пагинации
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/sa/blogs')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            name: `Test Blog ${i}`,
            description: `Test Description ${i}`,
            websiteUrl: `https://test-${i}.com`,
          })
          .expect(201);
      }

      // Добавляем задержку для обеспечения сохранения данных в БД
      await new Promise((resolve) => setTimeout(resolve, 200));

      const response = await request(app.getHttpServer())
        .get('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        });

      console.log('SA blogs response status:', response.status);
      console.log('SA blogs response body:', JSON.stringify(response.body));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body.totalCount).toBe(3);
      expect(response.body.items.length).toBe(3);
    });

    it('SA: должен получить блог по ID', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Сначала создаем блог для этого теста
      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(testBlog)
        .expect(201);

      createdBlogId = createResponse.body.id;

      // В SA контроллере нет эндпоинта для получения блога по ID
      // Используем публичный API для проверки
      const response = await request(app.getHttpServer())
        .get(`/api/blogs/${createdBlogId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(createdBlogId);
      expect(response.body.name).toBe(testBlog.name);
    });

    it('SA: должен обновить блог по ID', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Сначала создаем блог для этого теста
      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(testBlog)
        .expect(201);

      createdBlogId = createResponse.body.id;

      await request(app.getHttpServer())
        .put(`/api/sa/blogs/${createdBlogId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(updatedBlog)
        .expect(204);

      // Проверяем, что блог действительно обновился
      const response = await request(app.getHttpServer())
        .get(`/api/blogs/${createdBlogId}`)
        .expect(200);

      expect(response.body.name).toBe(updatedBlog.name);
      expect(response.body.description).toBe(updatedBlog.description);
      expect(response.body.websiteUrl).toBe(updatedBlog.websiteUrl);
    });

    it('SA: не должен обновить несуществующий блог', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Используем заведомо некорректный UUID
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .put(`/api/sa/blogs/${nonExistentId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(updatedBlog);

      console.log('Update nonexistent blog response status:', response.status);

      expect(response.status).toBe(404);
    });

    it('SA: не должен создать блог с невалидными данными', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const invalidBlog = {
        name: 'Blog name that is way too long and exceeds the maximum length limit',
        description: '', // Пустое описание
        websiteUrl: 'invalid-url', // Невалидный URL
      };

      const response = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(invalidBlog)
        .expect(400);

      expect(response.body).toHaveProperty('errorsMessages');
    });
  });

  describe('Публичный API для блогов', () => {
    it('Должен получить список блогов', async () => {
      // Очищаем базу и создаем тестовые данные
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);

      // Создаем несколько блогов
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/sa/blogs')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            name: `Public Blog ${i}`,
            description: `Public Description ${i}`,
            websiteUrl: `https://public-${i}.com`,
          })
          .expect(201);
      }

      // Задержка для гарантии сохранения
      await new Promise((resolve) => setTimeout(resolve, 200));

      const response = await request(app.getHttpServer()).get('/api/blogs');

      console.log('Public blogs response status:', response.status);
      console.log('Public blogs response body:', JSON.stringify(response.body));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body.totalCount).toBe(2);
      expect(response.body.items.length).toBe(2);
    });

    it('Должен получить конкретный блог по ID', async () => {
      // Очищаем базу и создаем тестовый блог
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);

      const testBlog = {
        name: 'Test Blog ID',
        description: 'This is a test blog for ID testing',
        websiteUrl: 'https://test-id.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(testBlog)
        .expect(201);

      const testBlogId = createResponse.body.id;

      // Небольшая задержка
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .get(`/api/blogs/${testBlogId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testBlogId);
      expect(response.body.name).toBe(testBlog.name);
    });

    it('Должен вернуть 404 при запросе несуществующего блога', async () => {
      // Используем заведомо некорректный UUID
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer()).get(
        `/api/blogs/${nonExistentId}`,
      );

      console.log('Nonexistent blog response status:', response.status);

      expect(response.status).toBe(404);
    });

    it('Должен работать фильтр поиска блога по имени', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Создаем блог с уникальным именем для поиска
      // Используем только последние 4 цифры timestamp для уникальности
      const uniqueName = 'Search' + (Date.now() % 10000);
      const uniqueBlog = {
        name: uniqueName,
        description: 'Blog for search testing',
        websiteUrl: 'https://search-test.com',
      };

      console.log('Creating blog with unique name:', uniqueName);

      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(uniqueBlog);

      console.log('Create blog response status:', createResponse.status);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.name).toBe(uniqueName);

      // Значительная задержка, чтобы убедиться, что данные сохранились в БД
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Ищем блог по имени
      console.log('Searching for blog with name:', uniqueName);
      const searchResponse = await request(app.getHttpServer()).get(
        `/api/blogs?searchNameTerm=${uniqueName}`,
      );

      console.log('Search response status:', searchResponse.status);
      console.log('Search response body:', JSON.stringify(searchResponse.body));

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.items.length).toBeGreaterThan(0);

      // Проверяем, что хотя бы один блог в ответе содержит наше имя
      const foundBlog = searchResponse.body.items.find(
        (blog: any) => blog.name === uniqueName,
      );
      expect(foundBlog).toBeDefined();
    });

    it('Должен корректно работать пагинация', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Создаем несколько блогов для теста пагинации
      const blogsToCreate = 5;
      const createdBlogIds: string[] = [];

      console.log(`Creating ${blogsToCreate} test blogs for pagination`);

      // Создаем блоги в цикле с задержкой
      for (let i = 0; i < blogsToCreate; i++) {
        const blog = {
          name: `Pagination ${i}`,
          description: `Pagination test blog ${i}`,
          websiteUrl: `https://pagination-${i}.com`,
        };

        const response = await request(app.getHttpServer())
          .post('/api/sa/blogs')
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send(blog);

        console.log(`Created blog ${i}, status:`, response.status);

        if (response.status === 201) {
          createdBlogIds.push(response.body.id);
        }

        // Задержка между созданиями для гарантии порядка
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Проверяем, что все блоги созданы
      console.log(
        `Created ${createdBlogIds.length} blogs out of ${blogsToCreate}`,
      );
      expect(createdBlogIds.length).toBe(blogsToCreate);

      // Значительная задержка перед запросами на пагинацию
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Получаем первую страницу с 2 элементами
      console.log('Getting first page of blogs');
      const page1Response = await request(app.getHttpServer()).get(
        '/api/blogs?pageNumber=1&pageSize=2',
      );

      console.log('Page 1 response status:', page1Response.status);
      console.log('Page 1 response body:', JSON.stringify(page1Response.body));

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.items.length).toBe(2);
      expect(page1Response.body.page).toBe(1);
      expect(page1Response.body.pageSize).toBe(2);
      expect(page1Response.body.totalCount).toBeGreaterThanOrEqual(
        blogsToCreate,
      );

      // Получаем вторую страницу
      console.log('Getting second page of blogs');
      const page2Response = await request(app.getHttpServer()).get(
        '/api/blogs?pageNumber=2&pageSize=2',
      );

      console.log('Page 2 response status:', page2Response.status);
      console.log('Page 2 response body:', JSON.stringify(page2Response.body));

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.page).toBe(2);
      expect(page2Response.body.items.length).toBe(2);

      // Получаем идентификаторы блогов с обеих страниц
      const page1Ids = page1Response.body.items.map((item: any) => item.id);
      const page2Ids = page2Response.body.items.map((item: any) => item.id);

      console.log('Page 1 IDs:', page1Ids);
      console.log('Page 2 IDs:', page2Ids);

      // Проверяем, что блоги на разных страницах разные
      const intersection = page1Ids.filter((id: string) =>
        page2Ids.includes(id),
      );
      expect(intersection.length).toBe(0);

      // Дополнительно проверяем общее количество блогов
      const allBlogsResponse = await request(app.getHttpServer()).get(
        '/api/blogs?pageSize=50',
      );

      console.log('All blogs response status:', allBlogsResponse.status);
      console.log(
        'All blogs response body:',
        JSON.stringify(allBlogsResponse.body),
      );
      console.log('Total blogs count:', allBlogsResponse.body.totalCount);
      expect(allBlogsResponse.body.totalCount).toBeGreaterThanOrEqual(
        blogsToCreate,
      );
    });
  });

  describe('Удаление блога', () => {
    it('SA: должен удалить блог', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Создаем блог для удаления
      const blogToDelete = {
        name: 'Blog to Delete',
        description: 'This blog will be deleted',
        websiteUrl: 'https://delete-me.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/sa/blogs')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(blogToDelete)
        .expect(201);

      const blogIdToDelete: string = createResponse.body.id;

      // Удаляем блог
      await request(app.getHttpServer())
        .delete(`/api/sa/blogs/${blogIdToDelete}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(204);

      // Проверяем, что блог действительно удален
      await request(app.getHttpServer())
        .get(`/api/blogs/${blogIdToDelete}`)
        .expect(404);
    });

    it('SA: не должен удалять несуществующий блог', async () => {
      // Очищаем базу перед тестом
      await dataSource.query(`TRUNCATE TABLE "Blogs" CASCADE;`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Используем заведомо некорректный UUID
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .delete(`/api/sa/blogs/${nonExistentId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        });

      console.log('Delete nonexistent blog response status:', response.status);

      expect(response.status).toBe(404);
    });
  });
});
