import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { appSetup } from '../src/setup/app.setup';
import { initAppAndListen } from './helpers/e2e-app';
import { clearDb } from './helpers/e2e-db';

/**
 * E2E тесты для модуля постов (Posts)
 *
 * Этот файл содержит комплексные end-to-end тесты для проверки функциональности постов.
 * Тесты покрывают:
 * - CRUD операции для постов через SA API (Super Admin)
 * - Публичный API для получения постов
 * - Создание комментариев к постам
 * - Систему лайков/дизлайков
 * - Валидацию входных данных
 * - Обработку ошибок (404, 400, 401)
 *
 * Архитектурный подход:
 * - Используется паттерн AAA (Arrange-Act-Assert)
 * - Каждый тест изолирован и очищает базу данных перед выполнением
 * - Тесты организованы в логические группы с помощью describe()
 */
describe('Posts (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Учетные данные для базовой авторизации (Super Admin)
  const adminCredentials = { username: 'admin', password: 'qwerty' };

  // Переменные для хранения созданных сущностей
  let createdBlogId: string;
  let createdPostId: string;
  let authToken: string;
  let userId: string;

  /**
   * Инициализация тестового окружения
   * Выполняется один раз перед всеми тестами
   */
  beforeAll(async () => {
    // Создаем тестовый модуль NestJS с импортом основного AppModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Получаем экземпляр приложения и DataSource для работы с БД
    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Применяем настройки приложения (pipes, guards, interceptors и т.д.)
    appSetup(app);
    await initAppAndListen(app);

    // Очищаем все таблицы перед запуском тестов
    // CASCADE удаляет связанные записи в зависимых таблицах
    await clearDb(app);
  });

  /**
   * Очистка ресурсов после всех тестов
   */
  afterAll(async () => {
    await app.close();
  });

  /**
   * Вспомогательная функция для создания тестового пользователя
   * Используется для тестов, требующих авторизации
   */
  async function createTestUser(
    username: string,
    email: string,
    password: string,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/sa/users')
      .auth(adminCredentials.username, adminCredentials.password, {
        type: 'basic',
      })
      .send({
        login: username,
        email: email,
        password: password,
      })
      .expect(201);

    return response.body;
  }

  /**
   * Вспомогательная функция для получения JWT токена
   * Используется для авторизации пользователя в тестах
   */
  async function loginUser(loginOrEmail: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        loginOrEmail: loginOrEmail,
        password: password,
      })
      .expect(200);

    return response.body.accessToken;
  }

  /**
   * Вспомогательная функция для создания тестового блога
   * Посты всегда создаются в контексте блога
   */
  async function createTestBlog(name: string, description: string) {
    const response = await request(app.getHttpServer())
      .post('/api/sa/blogs')
      .auth(adminCredentials.username, adminCredentials.password, {
        type: 'basic',
      })
      .send({
        name: name,
        description: description,
        websiteUrl: `https://${name.toLowerCase().replace(/\s/g, '-')}.com`,
      })
      .expect(201);

    return response.body;
  }

  /**
   * Группа тестов для CRUD операций постов через SA API
   * SA API требует базовой авторизации (admin/qwerty)
   */
  describe('SA API: CRUD операции для постов', () => {
    /**
     * Подготовка данных перед каждым тестом в этой группе
     */
    beforeEach(async () => {
      // Очищаем таблицы для изоляции тестов
      await clearDb(app);

      // Создаем тестовый блог, так как посты привязаны к блогам
      const blog = await createTestBlog('Test Blog', 'Test Description');
      createdBlogId = blog.id;
    });

    /**
     * Тест создания поста через SA API
     * Endpoint: POST /api/sa/blogs/:blogId/posts
     */
    it('SA: должен создать новый пост для блога', async () => {
      // Arrange: подготавливаем данные для создания поста
      const postData = {
        title: 'Test Post',
        shortDescription: 'This is a test post',
        content: 'This is the content of the test post',
      };

      // Act: отправляем запрос на создание поста
      const response = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(postData)
        .expect(201);

      // Assert: проверяем, что пост создан с правильными данными
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(postData.title);
      expect(response.body.shortDescription).toBe(postData.shortDescription);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.blogId).toBe(createdBlogId);
      expect(response.body).toHaveProperty('blogName');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('extendedLikesInfo');

      // Проверяем структуру extendedLikesInfo
      expect(response.body.extendedLikesInfo).toHaveProperty('likesCount');
      expect(response.body.extendedLikesInfo).toHaveProperty('dislikesCount');
      expect(response.body.extendedLikesInfo).toHaveProperty('myStatus');
      expect(response.body.extendedLikesInfo).toHaveProperty('newestLikes');

      // Сохраняем ID для использования в других тестах
      createdPostId = response.body.id;
    });

    /**
     * Тест получения всех постов для блога с пагинацией
     * Endpoint: GET /api/sa/blogs/:blogId/posts
     */
    it('SA: должен получить все посты блога с пагинацией', async () => {
      // Arrange: создаем несколько постов для проверки пагинации
      const postsCount = 5;
      for (let i = 0; i < postsCount; i++) {
        await request(app.getHttpServer())
          .post(`/api/sa/blogs/${createdBlogId}/posts`)
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            title: `Test Post ${i}`,
            shortDescription: `Description ${i}`,
            content: `Content ${i}`,
          })
          .expect(201);
      }

      // Act: получаем посты с параметрами пагинации
      const response = await request(app.getHttpServer())
        .get(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .query({ pageNumber: 1, pageSize: 3 })
        .expect(200);

      // Assert: проверяем структуру пагинированного ответа
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body.totalCount).toBe(postsCount);
      expect(response.body.items.length).toBe(3); // pageSize = 3
      expect(response.body.page).toBe(1);
    });

    /**
     * Тест обновления поста
     * Endpoint: PUT /api/sa/blogs/:blogId/posts/:postId
     */
    it('SA: должен обновить существующий пост', async () => {
      // Arrange: создаем пост для обновления
      const createResponse = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Original Title',
          shortDescription: 'Original Description',
          content: 'Original Content',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Данные для обновления
      const updatedData = {
        title: 'Updated Title',
        shortDescription: 'Updated Description',
        content: 'Updated Content',
      };

      // Act: обновляем пост
      await request(app.getHttpServer())
        .put(`/api/sa/blogs/${createdBlogId}/posts/${postId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(updatedData)
        .expect(204); // 204 No Content - успешное обновление без тела ответа

      // Assert: проверяем, что данные действительно обновились
      const getResponse = await request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .expect(200);

      expect(getResponse.body.title).toBe(updatedData.title);
      expect(getResponse.body.shortDescription).toBe(
        updatedData.shortDescription,
      );
      expect(getResponse.body.content).toBe(updatedData.content);
    });

    /**
     * Тест удаления поста
     * Endpoint: DELETE /api/sa/blogs/:blogId/posts/:postId
     */
    it('SA: должен удалить пост', async () => {
      // Arrange: создаем пост для удаления
      const createResponse = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Post to Delete',
          shortDescription: 'This post will be deleted',
          content: 'Content to be deleted',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Act: удаляем пост
      await request(app.getHttpServer())
        .delete(`/api/sa/blogs/${createdBlogId}/posts/${postId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .expect(204);

      // Assert: проверяем, что пост больше не доступен
      await request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .expect(404);
    });

    /**
     * Тест валидации: попытка создать пост с невалидными данными
     */
    it('SA: не должен создать пост с невалидными данными', async () => {
      // Arrange: подготавливаем невалидные данные
      const invalidPostData = {
        title: '', // Пустой title (должен быть 1-30 символов)
        shortDescription: 'a'.repeat(101), // Слишком длинное описание (макс 100)
        content: '', // Пустой content
      };

      // Act & Assert: ожидаем ошибку 400 Bad Request
      const response = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(invalidPostData)
        .expect(400);

      // Проверяем, что в ответе есть информация об ошибках валидации
      expect(response.body).toHaveProperty('errorsMessages');
      expect(Array.isArray(response.body.errorsMessages)).toBe(true);
    });

    /**
     * Тест обработки ошибки: попытка обновить несуществующий пост
     */
    it('SA: не должен обновить несуществующий пост', async () => {
      // Arrange: генерируем несуществующий UUID
      const nonExistentPostId = '00000000-0000-0000-0000-000000000000';

      // Act & Assert: ожидаем ошибку 404 Not Found
      await request(app.getHttpServer())
        .put(`/api/sa/blogs/${createdBlogId}/posts/${nonExistentPostId}`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Updated Title',
          shortDescription: 'Updated Description',
          content: 'Updated Content',
        })
        .expect(404);
    });
  });

  /**
   * Группа тестов для публичного API постов
   * Публичный API доступен без авторизации для чтения
   */
  describe('SA API: Управление постами', () => {
    beforeAll(async () => {
      await clearDb(app);
    });

    beforeEach(async () => {
      await clearDb(app);

      const blog = await createTestBlog('Public Blog', 'Public Description');
      createdBlogId = blog.id;
    });

    /**
     * Тест получения всех постов через публичный API
     * Endpoint: GET /api/posts
     */
    it('Должен получить все посты с пагинацией', async () => {
      // Arrange: создаем несколько постов
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/api/sa/blogs/${createdBlogId}/posts`)
          .auth(adminCredentials.username, adminCredentials.password, {
            type: 'basic',
          })
          .send({
            title: `Public Post ${i}`,
            shortDescription: `Public Description ${i}`,
            content: `Public Content ${i}`,
          })
          .expect(201);
      }

      // Act: получаем посты без авторизации
      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .expect(200);

      // Assert: проверяем структуру ответа
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.totalCount).toBe(3);
      expect(response.body.items.length).toBe(3);
    });

    /**
     * Тест получения конкретного поста по ID
     * Endpoint: GET /api/posts/:id
     */
    it('Должен получить пост по ID', async () => {
      // Arrange: создаем пост
      const createResponse = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Specific Post',
          shortDescription: 'Specific Description',
          content: 'Specific Content',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Act: получаем пост по ID
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .expect(200);

      // Assert: проверяем данные поста
      expect(response.body.id).toBe(postId);
      expect(response.body.title).toBe('Specific Post');
      expect(response.body.shortDescription).toBe('Specific Description');
      expect(response.body.content).toBe('Specific Content');
    });

    /**
     * Тест обработки ошибки: получение несуществующего поста
     */
    it('Должен вернуть 404 для несуществующего поста', async () => {
      const nonExistentPostId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/posts/${nonExistentPostId}`)
        .expect(404);
    });
  });

  /**
   * Группа тестов для создания постов через публичный API
   * Требует базовой авторизации
   */
  describe('Public API: Создание постов', () => {
    beforeEach(async () => {
      await clearDb(app);

      const blog = await createTestBlog('Test Blog', 'Test Description');
      createdBlogId = blog.id;
    });

    /**
     * Тест создания поста через публичный API
     * Endpoint: POST /api/posts
     */
    it('Должен создать пост с базовой авторизацией', async () => {
      const postData = {
        title: 'New Post',
        shortDescription: 'New Description',
        content: 'New Content',
        blogId: createdBlogId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(postData.title);
      expect(response.body.blogId).toBe(createdBlogId);
    });

    /**
     * Тест авторизации: попытка создать пост без авторизации
     */
    it('Не должен создать пост без авторизации', async () => {
      const postData = {
        title: 'Unauthorized Post',
        shortDescription: 'Should fail',
        content: 'Should not be created',
        blogId: createdBlogId,
      };

      await request(app.getHttpServer())
        .post('/api/posts')
        .send(postData)
        .expect(401); // 401 Unauthorized
    });
  });

  /**
   * Группа тестов для системы комментариев к постам
   * Комментарии могут создавать только авторизованные пользователи
   */
  describe('Комментарии к постам', () => {
    beforeEach(async () => {
      // Очищаем все связанные таблицы
      await clearDb(app);

      // Создаем пользователя для тестов с комментариями
      const user = await createTestUser(
        'testuser',
        'test@example.com',
        'password123',
      );
      userId = user.id;

      // Получаем JWT токен для авторизации
      authToken = await loginUser('testuser', 'password123');

      // Создаем блог и пост
      const blog = await createTestBlog('Comment Blog', 'Description');
      createdBlogId = blog.id;

      const post = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Post with Comments',
          shortDescription: 'Post for testing comments',
          content: 'Content for comments',
        })
        .expect(201);

      createdPostId = post.body.id;
    });

    /**
     * Тест создания комментария к посту
     * Endpoint: POST /api/posts/:id/comments
     */
    it('Должен создать комментарий к посту', async () => {
      const commentData = {
        content: 'This is a test comment with enough characters',
      };

      console.log('📝 Test data:', {
        postId: createdPostId,
        userId: userId,
        authToken: authToken ? 'exists' : 'missing',
        contentLength: commentData.content.length,
      });

      // Act: создаем комментарий с JWT авторизацией
      const response = await request(app.getHttpServer())
        .post(`/api/posts/${createdPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData);

      if (response.status !== 201) {
        console.error('❌ Response error:', {
          status: response.status,
          body: response.body,
        });
      }
      expect(response.status).toBe(201);

      // Assert: проверяем структуру комментария
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(commentData.content);
      expect(response.body).toHaveProperty('commentatorInfo');
      expect(response.body.commentatorInfo).toHaveProperty('userId');
      expect(response.body.commentatorInfo).toHaveProperty('userLogin');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('likesInfo');
    });

    /**
     * Тест получения всех комментариев поста
     * Endpoint: GET /api/posts/:id/comments
     */
    it('Должен получить все комментарии поста', async () => {
      // Arrange: создаем несколько комментариев
      const commentsCount = 3;
      for (let i = 0; i < commentsCount; i++) {
        await request(app.getHttpServer())
          .post(`/api/posts/${createdPostId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Test comment ${i} with enough characters to pass validation`,
          })
          .expect(201);
      }

      // Act: получаем комментарии
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}/comments`)
        .expect(200);

      // Assert: проверяем пагинированный ответ
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.totalCount).toBe(commentsCount);
      expect(response.body.items.length).toBe(commentsCount);
    });

    /**
     * Тест валидации: комментарий со слишком коротким содержимым
     */
    it('Не должен создать комментарий с коротким содержимым', async () => {
      const invalidComment = {
        content: 'Short', // Минимум обычно 20 символов
      };

      await request(app.getHttpServer())
        .post(`/api/posts/${createdPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidComment)
        .expect(400);
    });

    /**
     * Тест авторизации: попытка создать комментарий без токена
     */
    it('Не должен создать комментарий без авторизации', async () => {
      const commentData = {
        content: 'This comment should not be created without auth',
      };

      await request(app.getHttpServer())
        .post(`/api/posts/${createdPostId}/comments`)
        .send(commentData)
        .expect(401);
    });

    /**
     * Тест обработки ошибки: комментарий к несуществующему посту
     */
    it('Не должен создать комментарий для несуществующего поста', async () => {
      const nonExistentPostId = '00000000-0000-0000-0000-000000000000';
      const commentData = {
        content: 'Comment for non-existent post with enough characters',
      };

      await request(app.getHttpServer())
        .post(`/api/posts/${nonExistentPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(404);
    });
  });

  /**
   * Группа тестов для системы лайков/дизлайков постов
   * Лайки могут ставить только авторизованные пользователи
   */
  describe('Лайки и дизлайки постов', () => {
    beforeEach(async () => {
      await clearDb(app);

      // Создаем пользователя
      const user = await createTestUser(
        'likeuser',
        'like@example.com',
        'password123',
      );
      userId = user.id;
      authToken = await loginUser('likeuser', 'password123');

      // Создаем блог и пост
      const blog = await createTestBlog('Blog for Likes', 'Description');
      createdBlogId = blog.id;

      const post = await request(app.getHttpServer())
        .post(`/api/sa/blogs/${createdBlogId}/posts`)
        .auth(adminCredentials.username, adminCredentials.password, {
          type: 'basic',
        })
        .send({
          title: 'Post for Likes',
          shortDescription: 'Post for testing likes',
          content: 'Content for likes',
        })
        .expect(201);

      createdPostId = post.body.id;
    });

    /**
     * Тест установки лайка на пост
     * Endpoint: PUT /api/posts/:id/like-status
     */
    it('Должен поставить лайк посту', async () => {
      // Act: устанавливаем статус "Like"
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'Like' })
        .expect(204);

      // Assert: проверяем, что лайк учтен
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.extendedLikesInfo.likesCount).toBe(1);
      expect(response.body.extendedLikesInfo.dislikesCount).toBe(0);
      expect(response.body.extendedLikesInfo.myStatus).toBe('Like');
    });

    /**
     * Тест установки дизлайка на пост
     */
    it('Должен поставить дизлайк посту', async () => {
      // Act: устанавливаем статус "Dislike"
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'Dislike' })
        .expect(204);

      // Assert: проверяем, что дизлайк учтен
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.extendedLikesInfo.likesCount).toBe(0);
      expect(response.body.extendedLikesInfo.dislikesCount).toBe(1);
      expect(response.body.extendedLikesInfo.myStatus).toBe('Dislike');
    });

    /**
     * Тест изменения лайка на дизлайк
     */
    it('Должен изменить лайк на дизлайк', async () => {
      // Arrange: сначала ставим лайк
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'Like' })
        .expect(204);

      // Act: меняем на дизлайк
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'Dislike' })
        .expect(204);

      // Assert: проверяем изменение
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.extendedLikesInfo.likesCount).toBe(0);
      expect(response.body.extendedLikesInfo.dislikesCount).toBe(1);
      expect(response.body.extendedLikesInfo.myStatus).toBe('Dislike');
    });

    /**
     * Тест сброса лайка (установка статуса "None")
     */
    it('Должен убрать лайк (установить None)', async () => {
      // Arrange: ставим лайк
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'Like' })
        .expect(204);

      // Act: убираем лайк
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'None' })
        .expect(204);

      // Assert: проверяем, что лайк убран
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.extendedLikesInfo.likesCount).toBe(0);
      expect(response.body.extendedLikesInfo.dislikesCount).toBe(0);
      expect(response.body.extendedLikesInfo.myStatus).toBe('None');
    });

    /**
     * Тест валидации: невалидный статус лайка
     */
    it('Не должен принять невалидный статус лайка', async () => {
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ likeStatus: 'InvalidStatus' })
        .expect(400);
    });

    /**
     * Тест авторизации: попытка поставить лайк без авторизации
     */
    it('Не должен поставить лайк без авторизации', async () => {
      await request(app.getHttpServer())
        .put(`/api/posts/${createdPostId}/like-status`)
        .send({ likeStatus: 'Like' })
        .expect(401);
    });

    /**
     * Тест отображения новейших лайков (newestLikes)
     * Проверяем, что в ответе есть информация о последних 3 лайках
     */
    it('Должен показать информацию о новейших лайках', async () => {
      // Arrange: создаем несколько пользователей и ставим лайки
      const users: Array<{ id: string; login: string; token: string }> = [];
      for (let i = 0; i < 4; i++) {
        const user = await createTestUser(
          `likeuser${i}`,
          `like${i}@example.com`,
          'password123',
        );
        const token = await loginUser(`likeuser${i}`, 'password123');
        users.push({ id: user.id, login: user.login, token });

        // Ставим лайк от каждого пользователя
        await request(app.getHttpServer())
          .put(`/api/posts/${createdPostId}/like-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ likeStatus: 'Like' })
          .expect(204);

        // Небольшая задержка для различия времени
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Act: получаем пост
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPostId}`)
        .expect(200);

      // Assert: проверяем newestLikes
      expect(response.body.extendedLikesInfo.likesCount).toBe(4);
      expect(response.body.extendedLikesInfo.newestLikes).toHaveLength(3); // Показываем только 3 последних

      // Проверяем структуру каждого элемента в newestLikes
      response.body.extendedLikesInfo.newestLikes.forEach((like: any) => {
        expect(like).toHaveProperty('addedAt');
        expect(like).toHaveProperty('userId');
        expect(like).toHaveProperty('login');
      });
    });
  });

      /**
       * Группа тестов для проверки пагинации и сортировки
       */
      describe('Пагинация и сортировка постов', () => {
        beforeEach(async () => {
          await clearDb(app);

          const blog = await createTestBlog('Pagination Blog', 'Description');
          createdBlogId = blog.id;

          // Создаем 10 постов для тестирования пагинации
          for (let i = 0; i < 10; i++) {
            await request(app.getHttpServer())
              .post(`/api/sa/blogs/${createdBlogId}/posts`)
              .auth(adminCredentials.username, adminCredentials.password, {
                type: 'basic',
              })
              .send({
                title: `Post ${i}`,
                shortDescription: `Description ${i}`,
                content: `Content ${i}`,
              })
              .expect(201);

            // Задержка для различия времени создания
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        });

    /**
     * Тест пагинации: первая страница
     */
    it('Должен вернуть первую страницу постов', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .query({ pageNumber: 1, pageSize: 5 })
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(5);
      expect(response.body.items.length).toBe(5);
      expect(response.body.totalCount).toBe(10);
      expect(response.body.pagesCount).toBe(2);
    });

    /**
     * Тест пагинации: вторая страница
     */
    it('Должен вернуть вторую страницу постов', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .query({ pageNumber: 2, pageSize: 5 })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(5);
      expect(response.body.items.length).toBe(5);
    });

    /**
     * Тест сортировки по дате создания (по умолчанию - от новых к старым)
     */
    it('Должен вернуть посты отсортированные по дате создания (desc)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .query({ sortBy: 'createdAt', sortDirection: 'desc' })
        .expect(200);

      // Проверяем, что посты отсортированы от новых к старым
      const dates = response.body.items.map((post: any) =>
        new Date(post.createdAt).getTime(),
      );

      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });
  });
});
