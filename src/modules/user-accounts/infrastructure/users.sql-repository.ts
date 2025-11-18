import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserNotFoundException } from '../../../core/domain';
import { UserEntity } from '../domain/user-entity';
import { SqlUserAdapter } from './adapters/sql-user.adapter';

// Интерфейс для сырых данных из PostgreSQL
// validRefreshTokens и deviceToTokenMapping хранятся как JSON в БД
export interface ISqlUser {
  id: string;
  login: string;
  email: string;
  passwordHash: string;
  isEmailConfirmed: boolean;
  confirmCode: string | null;
  expirationCode: string | null;
  passwordRecoveryCode: string | null;
  passwordRecoveryExpiration: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

@Injectable()
export class UsersSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async findById(id: string): Promise<UserEntity | null> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT *
       FROM "Users"
       WHERE id = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawUsers[0]) {
      return null;
    }
    return SqlUserAdapter.toEntity(rawUsers[0]);
  }

  async findByLogin(UserLogin: string): Promise<UserEntity | null | undefined> {
    console.log('🔍 Searching user by login:', UserLogin);
    console.log('📊 Database connection state:', {
      isConnected: this.dataSource.isInitialized,
      database: this.dataSource.options.database,
    });

    try {
      const rawUsers: ISqlUser[] = await this.dataSource.query(
        `SELECT *
         FROM "Users"
         WHERE login = $1 AND "deletedAt" IS NULL`,
        [UserLogin],
      );
      if (!rawUsers[0]) {
        return null;
      }
      return SqlUserAdapter.toEntity(rawUsers[0]);
    } catch (e) {
      console.log(e);
    }
  }

  async findByEmail(UserEmail: string): Promise<UserEntity | null> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT *
       FROM "Users"
       WHERE email = $1 AND "deletedAt" IS NULL`,
      [UserEmail],
    );
    if (!rawUsers[0]) {
      return null;
    }
    return SqlUserAdapter.toEntity(rawUsers[0]);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    try {
      // Если у пользователя есть id, делаем update, иначе insert
      if (user.id) {
        return await this.update(user);
      }

      const rawUsers: ISqlUser[] = await this.dataSource.query(
        `INSERT INTO "Users" (login, email, "passwordHash", "isEmailConfirmed",
                              "confirmCode", "expirationCode", "passwordRecoveryCode",
                              "passwordRecoveryExpiration", "createdAt", "updatedAt", "deletedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          user.login,
          user.email,
          user.passwordHash,
          user.isEmailConfirmed || false,
          user.confirmCode || null,
          user.expirationCode?.toISOString() || null,
          user.passwordRecoveryCode || null,
          user.passwordRecoveryExpiration?.toISOString() || null,
          user.createdAt || new Date(),
          new Date(),
          user.deletedAt?.toISOString() || null,
        ],
      );
      console.log('✅ Saved user to database:', {
        login: user.login,
        email: user.email,
        hasPasswordHash: !!user.passwordHash,
        isEmailConfirmed: user.isEmailConfirmed,
        confirmCode: user.confirmCode,
        expirationCode: user.expirationCode,
      });
      return SqlUserAdapter.toEntity(rawUsers[0]);
    } catch (error) {
      console.error('❌ Error saving user to database:', error);
      throw error;
    }
  }

  async update(user: UserEntity): Promise<UserEntity> {
    try {
      const rawUsers: ISqlUser[] = await this.dataSource.query(
        `UPDATE "Users"
         SET login                        = $1,
             email                        = $2,
             "passwordHash"               = $3,
             "isEmailConfirmed"           = $4,
             "confirmCode"                = $5,
             "expirationCode"             = $6,
             "passwordRecoveryCode"       = $7,
             "passwordRecoveryExpiration" = $8,
                "updatedAt" = $9,
                "deletedAt" = $10
         WHERE id = $11
             RETURNING *`,
        [
          user.login,
          user.email,
          user.passwordHash,
          user.isEmailConfirmed,
          user.confirmCode || null,
          user.expirationCode?.toISOString() || null,
          user.passwordRecoveryCode || null,
          user.passwordRecoveryExpiration?.toISOString() || null,
          new Date(),
          user.deletedAt?.toISOString() || null,
          user.id,
        ],
      );

      if (!rawUsers[0]) {
        throw new UserNotFoundException('User not found for update');
      }

      console.log('✅ Updated user in database:', {
        id: user.id,
        login: user.login,
        email: user.email,
      });

      return SqlUserAdapter.toEntity(rawUsers[0]);
    } catch (error) {
      console.error('❌ Error updating user in database:', error);
      throw error;
    }
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<UserEntity | null> {
    console.log('🔍 Searching user by login or email:', loginOrEmail);
    console.log('📊 Database connection state:', {
      isConnected: this.dataSource.isInitialized,
      database: this.dataSource.options.database,
    });

    try {
      const rawUsers: ISqlUser[] = await this.dataSource.query(
        `SELECT *
         FROM "Users"
         WHERE (login = $1
           OR email = $1)
           AND "deletedAt" IS NULL`,
        [loginOrEmail],
      );
      if (!rawUsers[0]) {
        return null;
      }
      return SqlUserAdapter.toEntity(rawUsers[0]);
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async findUserByConfirmationCode(code: string): Promise<UserEntity | null> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT *
       FROM "Users"
       WHERE "confirmCode" = $1 AND "deletedAt" IS NULL`,
      [code],
    );
    if (!rawUsers[0]) {
      return null;
    }
    return SqlUserAdapter.toEntity(rawUsers[0]);
  }

  async findUserByPasswordRecoveryCode(
    code: string,
  ): Promise<UserEntity | null> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT *
       FROM "Users"
       WHERE "passwordRecoveryCode" = $1 AND "deletedAt" IS NULL`,
      [code],
    );
    if (!rawUsers[0]) {
      return null;
    }
    return SqlUserAdapter.toEntity(rawUsers[0]);
  }

  async deleteUser(id: string): Promise<void> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT *
       FROM "Users"
       WHERE id = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    if (!rawUsers[0] || rawUsers[0].deletedAt !== null) {
      throw new UserNotFoundException('User not found');
    }

    await this.dataSource.query(
      `UPDATE "Users"
       SET "deletedAt" = $1
       WHERE id = $2`,
      [new Date(), id],
    );
  }
}
