import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SessionViewDto } from '../api/view-dto/session.view-dto';
import { ISqlSession } from './sessions.sql-repository';

export class SessionsSqlQueryRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async getAllSessions(userId: string): Promise<SessionViewDto[] | null> {
    const rawSessions: ISqlSession[] = await this.dataSource.query(
      `SELECT *
        FROM "Sessions"
        WHERE "userId" = $1`,
      [userId],
    );
    if (!rawSessions.length) {
      return null;
    }
    return SessionViewDto.mapToSessionViewDto(rawSessions);
  }
}
