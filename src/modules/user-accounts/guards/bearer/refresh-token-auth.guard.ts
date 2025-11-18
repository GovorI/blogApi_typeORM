import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { Request } from 'express';
import { JwtService } from '../../application/jwt-service';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';
import { SessionsSqlRepository } from '../../infrastructure/sessions.sql-repository';

@Injectable()
export class RefreshTokenAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersSqlRepository,
    private readonly sessionsRepository: SessionsSqlRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Refresh token not found',
      });
    }

    try {
      const payload = await this.jwtService.verifyToken(refreshToken);
      const userId = payload?.sub;
      const sessionId = payload?.jti;
      const deviceId = payload?.deviceId;
      const iat = payload?.iat;

      if (!userId || !sessionId || !deviceId || !iat) {
        throw new DomainException({
          code: DomainExceptionCode.Unauthorized,
          message: 'Invalid refresh token payload',
        });
      }

      const user = await this.usersRepository.findById(userId);
      if (!user || user.deletedAt) {
        throw new DomainException({
          code: DomainExceptionCode.Unauthorized,
          message: 'User not found or deleted',
        });
      }

      const session = await this.sessionsRepository.findSessionById(sessionId);
      if (!session) {
        throw new DomainException({
          code: DomainExceptionCode.Unauthorized,
          message: 'Session not found',
        });
      }

      if (session.iat.getTime() !== iat * 1000) {
        throw new DomainException({
          code: DomainExceptionCode.Unauthorized,
          message: 'Invalid refresh token',
        });
      }

      if (session.deviceId !== deviceId) {
        throw new DomainException({
          code: DomainExceptionCode.Unauthorized,
          message: 'Invalid device ID',
        });
      }

      request.user = {
        id: userId,
        deviceId: deviceId,
      };

      return true;
    } catch (error) {
      // Если это уже DomainException, пробрасываем как есть
      if (error instanceof DomainException) {
        throw error;
      }
      // Для других ошибок (например, ошибки JWT) выбрасываем общую ошибку
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Invalid refresh token',
      });
    }
  }
}
