import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Сервис для очистки базы данных в тестовой среде
 * Используется для сброса состояния БД между тестами
 */
@Injectable()
export class DatabaseCleanupService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async clearAllTables(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    try {
      // Get all table names from the database
      const tables = await queryRunner.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);

      const tableNames = (tables as Array<{ table_name: string }>).map(
        (t) => t.table_name,
      );

      const filtered = tableNames.filter(
        (name) => name !== 'migrations' && name !== 'typeorm_metadata',
      );

      if (filtered.length > 0) {
        const quotedList = filtered.map((n) => `"${n}"`).join(', ');
        // Один TRUNCATE на все таблицы существенно быстрее, чем цикл запросов
        await queryRunner.query(`TRUNCATE TABLE ${quotedList} CASCADE;`);
      }
    } catch (error) {
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // async dropAllTables(): Promise<void> {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();
  //
  //   try {
  //     // Get all table names from the database
  //     const tables = await queryRunner.query(`
  //       SELECT table_name
  //       FROM information_schema.tables
  //       WHERE table_schema = 'public'
  //       AND table_type = 'BASE TABLE'
  //     `);
  //
  //     // Drop all tables with CASCADE to handle foreign keys
  //     for (const table of tables) {
  //       await queryRunner.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE`);
  //     }
  //
  //     await queryRunner.commitTransaction();
  //   } catch (error) {
  //     await queryRunner.rollbackTransaction();
  //     throw error;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  // async resetDatabase(): Promise<void> {
  //   // First try to clear all data, if that fails - drop and recreate
  //   try {
  //     await this.clearAllTables();
  //   } catch (error) {
  //     console.log('Clear failed, dropping tables:', error.message);
  //     await this.dropAllTables();
  //   }
  // }
}
