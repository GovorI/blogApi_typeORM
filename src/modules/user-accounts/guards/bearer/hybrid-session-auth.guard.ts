import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../../application/jwt-service';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';
import { SessionsSqlRepository } from '../../infrastructure/sessions.sql-repository';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class HybridSessionAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersSqlRepository,
    private readonly sessionsRepository: SessionsSqlRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Try Bearer token first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      try {
        const payload = await this.jwtService.verifyToken(accessToken);
        const userId = payload?.sub;
        const deviceId = payload?.deviceId;

        if (userId && deviceId) {
          const user = await this.usersRepository.findById(userId);
          if (user && !user.deletedAt) {
            request.user = {
              id: userId,
              deviceId: deviceId,
            };
            return true;
          }
        }
      } catch (error) {
        // Bearer token failed, try refresh token
      }
    }

    // Try refresh token from cookies
    const refreshToken = request.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyToken(refreshToken);
        const userId = payload?.sub;
        const sessionId = payload?.jti;
        const deviceId = payload?.deviceId;
        const iat = payload.iat;

        if (userId && sessionId && deviceId && iat) {
          const user = await this.usersRepository.findById(userId);
          if (!user || user.deletedAt) {
            throw new DomainException({
              code: DomainExceptionCode.Unauthorized,
              message: 'User not found',
            });
          }

          const session =
            await this.sessionsRepository.findSessionById(sessionId);
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
        }
      } catch (error) {
        // Refresh token also failed
        console.log('refresh token failed:', error.message);
        if (error instanceof DomainException) {
          // не глотаем, пробрасываем дальше
          throw error;
        }
      }
    }

    throw new DomainException({
      code: DomainExceptionCode.Unauthorized,
      message: 'Authentication required',
    });
  }
}
