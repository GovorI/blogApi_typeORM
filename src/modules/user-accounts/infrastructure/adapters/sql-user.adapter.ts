import { UserEntity } from '../../domain/user-entity';
import { ISqlUser } from '../users.sql-repository';

export class SqlUserAdapter {
  /**
   * Преобразует сырые данные из PostgreSQL в доменную сущность UserEntity
   * Обрабатывает JSON поля, которые могут прийти как строка или уже распарсенные данные
   */
  static toEntity(sqlUser: ISqlUser): UserEntity {
    return new UserEntity({
      id: sqlUser.id,
      login: sqlUser.login,
      email: sqlUser.email,
      passwordHash: sqlUser.passwordHash,
      isEmailConfirmed: sqlUser.isEmailConfirmed,
      confirmCode: sqlUser.confirmCode,
      expirationCode: sqlUser.expirationCode
        ? new Date(sqlUser.expirationCode)
        : null,
      passwordRecoveryCode: sqlUser.passwordRecoveryCode,
      passwordRecoveryExpiration: sqlUser.passwordRecoveryExpiration
        ? new Date(sqlUser.passwordRecoveryExpiration)
        : null,
      createdAt: new Date(sqlUser.createdAt),
      updatedAt: new Date(sqlUser.updatedAt),
      deletedAt: sqlUser.deletedAt ? new Date(sqlUser.deletedAt) : null,
    });
  }

  static toSql(userEntity: UserEntity): Partial<ISqlUser> {
    return {
      id: userEntity.id,
      login: userEntity.login,
      email: userEntity.email,
      passwordHash: userEntity.passwordHash,
      isEmailConfirmed: userEntity.isEmailConfirmed,
      confirmCode: userEntity.confirmCode,
      expirationCode: userEntity.expirationCode?.toISOString() || null,
      passwordRecoveryCode: userEntity.passwordRecoveryCode,
      passwordRecoveryExpiration:
        userEntity.passwordRecoveryExpiration?.toISOString() || null,
      createdAt: userEntity.createdAt.toISOString(),
      updatedAt: userEntity.updatedAt.toISOString(),
      deletedAt: userEntity.deletedAt?.toISOString() || null,
    };
  }
}
