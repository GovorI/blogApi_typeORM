import { ISqlSession } from '../sessions.sql-repository';
import { SessionEntity } from '../../domain/session-entity';

export class SqlSessionAdapter {
  static toEntity(sqlSession: ISqlSession): SessionEntity {
    return new SessionEntity({
      id: sqlSession.id,
      userId: sqlSession.userId,
      deviceId: sqlSession.deviceId,
      deviceName: sqlSession.deviceName,
      ip: sqlSession.ip,
      iat: new Date(sqlSession.iat * 1000),
      exp: new Date(sqlSession.exp * 1000),
      createdAt: new Date(sqlSession.createdAt),
      updatedAt: new Date(sqlSession.updatedAt),
    });
  }

  static toSql(sessionEntity: SessionEntity): Partial<ISqlSession> {
    return {
      id: sessionEntity.id,
      userId: sessionEntity.userId,
      deviceId: sessionEntity.deviceId,
      deviceName: sessionEntity.deviceName,
      ip: sessionEntity.ip,
      iat: Math.floor(sessionEntity.iat.getTime() / 1000),
      exp: Math.floor(sessionEntity.exp.getTime() / 1000),
      createdAt: sessionEntity.createdAt.toISOString(),
      updatedAt: sessionEntity.updatedAt.toISOString(),
    };
  }
}
