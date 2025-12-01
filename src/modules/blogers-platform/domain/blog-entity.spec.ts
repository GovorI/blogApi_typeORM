import { BlogEntity } from './blog-entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

describe('BlogEntity', () => {
  let blog: BlogEntity;

  beforeEach(() => {
    blog = new BlogEntity();
    blog.id = 'test-id';
    blog.name = 'Test Blog';
    blog.description = 'Test Description';
    blog.websiteUrl = 'https://test.com';
    blog.createdAt = new Date();
    blog.updatedAt = new Date();
    blog.deletedAt = null;
  });

  describe('makeDeleted', () => {
    it('должен пометить блог как удаленный', () => {
      // Изначально блог не удален
      expect(blog.deletedAt).toBeNull();

      // Выполняем удаление
      blog.makeDeleted();

      // Проверяем, что блог помечен как удаленный
      expect(blog.deletedAt).not.toBeNull();
      expect(blog.deletedAt instanceof Date).toBeTruthy();
    });

    it('должен выбросить исключение при попытке повторного удаления', () => {
      // Первое удаление
      blog.makeDeleted();

      // Пытаемся удалить ещё раз - должно быть исключение
      expect(() => blog.makeDeleted()).toThrow(DomainException);
      expect(() => blog.makeDeleted()).toThrow('Entity already deleted');

      // Проверяем код исключения
      try {
        blog.makeDeleted();
      } catch (error) {
        expect(error instanceof DomainException).toBeTruthy();
        expect(error.code).toBe(DomainExceptionCode.NotFound);
      }
    });
  });

  describe('свойства сущности', () => {
    it('должны правильно сохранять и возвращать значения', () => {
      const now = new Date();

      blog.id = 'new-id';
      blog.name = 'New Name';
      blog.description = 'New Description';
      blog.websiteUrl = 'https://new-url.com';
      blog.isMembership = true;
      blog.createdAt = now;
      blog.updatedAt = now;

      expect(blog.id).toBe('new-id');
      expect(blog.name).toBe('New Name');
      expect(blog.description).toBe('New Description');
      expect(blog.websiteUrl).toBe('https://new-url.com');
      expect(blog.isMembership).toBe(true);
      expect(blog.createdAt).toBe(now);
      expect(blog.updatedAt).toBe(now);
    });
  });
});
