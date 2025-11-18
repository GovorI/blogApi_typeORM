import { Injectable } from '@nestjs/common';
import { UsersSqlRepository } from '../infrastructure/users.sql-repository';
import { CryptoService } from './crypto-service';
import { UserContextDto } from '../guards/dto/user-context.dto';
import { TooManyRequestsException } from '../../../core/domain/domain.exception';
import { RateLimiterService } from '../../../core/services/rate-limiter.service';
import { UsersConfig } from '../config/users.config';
import { RateLimiterConfig } from '../config/rate-limiter.config';
import { UserEntity } from '../domain/user-entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersSqlRepository,
    private readonly cryptoService: CryptoService,
    private readonly rateLimiter: RateLimiterService,
    private readonly usersConfig: UsersConfig,
    private readonly rateLimiterConfig: RateLimiterConfig,
  ) {}

  async validateUser(
    loginOrEmail: string,
    password: string,
    ip: string | undefined,
  ): Promise<UserContextDto | null> {
    const user: UserEntity | null =
      await this.usersRepository.findByLoginOrEmail(loginOrEmail);

    console.log('Finded user in auth service', user);

    if (!user) {
      console.log('❌ User not found by login or email:', loginOrEmail);
      const key = `login:${ip ?? 'unknown'}`;
      const limited = this.rateLimiter.isLimited(
        key,
        this.rateLimiterConfig.max,
        this.rateLimiterConfig.windowMs,
      );
      if (limited) {
        throw new TooManyRequestsException();
      }
      return null;
    }

    console.log('User is confirmed', user.isEmailConfirmed);
    console.log(
      'User is automatically confirmed',
      this.usersConfig.isAutomaticallyConfirmed,
    );

    if (!this.usersConfig.isAutomaticallyConfirmed && !user.isEmailConfirmed) {
      console.log('❌ User email not confirmed');
      return null;
    }

    const isPasswordValid = await this.cryptoService.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const key = `login:${ip ?? 'unknown'}`;
      const limited = this.rateLimiter.isLimited(
        key,
        this.rateLimiterConfig.max,
        this.rateLimiterConfig.windowMs,
      );
      if (limited) {
        throw new TooManyRequestsException();
      }
      return null;
    }
    console.log(user);
    return { id: user.id };
  }
}
