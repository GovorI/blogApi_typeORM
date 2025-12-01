import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SessionViewDto } from '../api/view-dto/session.view-dto';
// import { ISqlSession } from './sessions.repository';
import { SessionEntity } from '../domain/session-entity';

export class SessionsQueryRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async getAllSessions(userId: string): Promise<SessionViewDto[] | null> {
    const sessions = await this.dataSource
      .getRepository(SessionEntity)
      .createQueryBuilder('sessions')
      .where('sessions.userId = :userId', { userId })
      .getMany();
    if (!sessions.length) {
      return null;
    }
    return SessionViewDto.mapToSessionViewDto(sessions);
  }
}
