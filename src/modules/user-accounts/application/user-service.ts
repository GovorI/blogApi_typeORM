import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  UserNotFoundException,
} from '../../../core/domain/domain.exception';
import { UserEntity } from '../domain/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { CryptoService } from './crypto-service';
import { UsersRepository } from '../infrastructure/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private bcryptService: CryptoService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<string> {
    const [existingUserByLogin, existingUserByEmail] = await Promise.all([
      this.usersRepository.findByLogin(dto.login),
      this.usersRepository.findByEmail(dto.email),
    ]);

    if (existingUserByLogin) {
      throw new BadRequestException('Login already exists');
    }
    if (existingUserByEmail) {
      throw new BadRequestException('Email already exists');
    }

    const user = this.usersRepository.create({
      login: dto.login,
      email: dto.email,
      passwordHash: await this.bcryptService.createPassHash(dto.password),
      isEmailConfirmed: false, // По умолчанию не подтвержден
      confirmCode: null,
      expirationCode: null,
      passwordRecoveryCode: null,
      passwordRecoveryCodeExpiration: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    // Admin-created users don't require email confirmation
    user.isEmailConfirmed = true;
    user.confirmCode = null;
    user.expirationCode = null;

    const res = await this.usersRepository.save(user);
    return res.id;
  }

  async deleteUser(id: string): Promise<void> {
    console.log('Deleting user with id:', id);
    return this.usersRepository.deleteUser(id);
  }

  async getUserByIdOrNotFound(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException('User not found');
    }
    return user;
  }
}
