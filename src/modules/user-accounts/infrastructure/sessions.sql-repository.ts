import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SqlSessionAdapter } from './adapters/sql-session.adapter';
import { SessionEntity } from '../domain/session-entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

export interface ISqlSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ip: string;
  iat: number;
  exp: number;
  createdAt: string;
  updatedAt: string;
}

export class SessionsSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async save(session: SessionEntity): Promise<void> {
    try {
      const query = `
        INSERT INTO "Sessions" (id, "userId", "deviceId", "deviceName", ip, iat, exp, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT ("id") DO UPDATE SET
          "deviceName" = EXCLUDED."deviceName",
          "deviceId"= EXCLUDED."deviceId",
          ip = EXCLUDED.ip,
          iat = EXCLUDED.iat,
          exp = EXCLUDED.exp,
          "updatedAt" = EXCLUDED."updatedAt";
      `;
      const sqlSessionData = SqlSessionAdapter.toSql(session);
      await this.dataSource.query(query, [
        sqlSessionData.id,
        sqlSessionData.userId,
        sqlSessionData.deviceId,
        sqlSessionData.deviceName,
        sqlSessionData.ip,
        sqlSessionData.iat,
        sqlSessionData.exp,
        sqlSessionData.createdAt,
        sqlSessionData.updatedAt,
      ]);
    } catch (error) {
      console.error('Error saving session:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session save',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async findSessionById(id: string): Promise<SessionEntity | null> {
    try {
      const rawSessions: ISqlSession[] = await this.dataSource.query(
        `SELECT *
         FROM "Sessions"
         WHERE "id" = $1`,
        [id],
      );
      if (!rawSessions[0]) {
        return null;
      }
      return SqlSessionAdapter.toEntity(rawSessions[0]);
    } catch (error) {
      console.error('Error finding session by ID:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session lookup',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async findSessionByUserIdAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<SessionEntity | null> {
    try {
      const rawSessions: ISqlSession[] = await this.dataSource.query(
        `SELECT *
         FROM "Sessions"
         WHERE "userId" = $1 AND "deviceId"::text = $2`,
        [userId, deviceId],
      );
      if (!rawSessions[0]) {
        return null;
      }
      return SqlSessionAdapter.toEntity(rawSessions[0]);
    } catch (error) {
      console.error('Error finding session by user ID and device ID:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session lookup',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async deleteSessionByUserIdAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<boolean> {
    try {
      const rows: ISqlSession[] = await this.dataSource.query(
        `DELETE FROM "Sessions"
         WHERE "userId" = $1 AND "deviceId" = $2
         RETURNING id`,
        [userId, deviceId],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      console.error('Error deleting session by user ID and device ID:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session deletion',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async deleteAllSessionsExceptCurrent(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `
      DELETE
      FROM "Sessions"
      WHERE "userId" = $1 AND "deviceId" <> $2
      `,
        [userId, currentDeviceId],
      );
    } catch (error) {
      console.error('Error deleting all sessions except current:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during multiple session deletion',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async findSessionByDeviceId(deviceId: string): Promise<SessionEntity | null> {
    try {
      const rawSessions: ISqlSession[] = await this.dataSource.query(
        `SELECT *
         FROM "Sessions"
         WHERE "deviceId"::text = $1`,
        [deviceId],
      );
      if (!rawSessions[0]) {
        return null;
      }
      return SqlSessionAdapter.toEntity(rawSessions[0]);
    } catch (error) {
      console.error('Error finding session by device ID:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session lookup',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }

  async deleteSessionByDeviceId(deviceId: string): Promise<boolean> {
    try {
      const rows: ISqlSession[] = await this.dataSource.query(
        `DELETE FROM "Sessions"
         WHERE "deviceId"::text = $1
         RETURNING id`,
        [deviceId],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      console.error('Error deleting session by device ID:', error);
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Database error during session deletion',
        extensions: [{ message: error.message, key: 'database' }],
      });
    }
  }
}
