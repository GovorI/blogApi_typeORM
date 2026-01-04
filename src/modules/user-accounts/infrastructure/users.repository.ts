import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserNotFoundException } from '../../../core/domain';
import { UserEntity } from '../domain/user.entity';

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
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  create(data: Partial<UserEntity>): UserEntity {
    return this.usersRepository.create({
      ...data,
      id: data.id || randomUUID(),
    });
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async findByLogin(UserLogin: string): Promise<UserEntity | null | undefined> {
    return this.usersRepository.findOne({
      where: { login: UserLogin, deletedAt: IsNull() },
    });
  }

  async findByEmail(UserEmail: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { email: UserEmail, deletedAt: IsNull() },
    });
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: [
        { login: loginOrEmail, deletedAt: IsNull() },
        { email: loginOrEmail, deletedAt: IsNull() },
      ],
    });
  }

  async findUserByConfirmationCode(code: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { confirmCode: code, deletedAt: IsNull() },
    });
  }

  async findUserByPasswordRecoveryCode(
    code: string,
  ): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { passwordRecoveryCode: code, deletedAt: IsNull() },
    });
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new UserNotFoundException('User not found');
    }
    user.makeDeleted();
    await this.usersRepository.save(user);
  }
}
