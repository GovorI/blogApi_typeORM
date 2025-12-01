import { CommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException as DomainUnauthorizedException } from '../../../../core/domain';
import { JwtService } from '../jwt-service';
import { JwtConfig } from '../../../jwt/jwt.config';
import { SessionsRepository } from '../../infrastructure/sessions.repository';

export class RefreshTokenCommand {
  constructor(public refreshToken: string) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtConfig: JwtConfig,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute(command: RefreshTokenCommand) {
    try {
      const payload = await this.jwtService.verifyToken(command.refreshToken);
      if (!payload.sub || !payload.jti || !payload.deviceId) {
        throw new DomainUnauthorizedException();
      }

      const userId = payload.sub;
      const sessionId = payload?.jti;
      const deviceId = payload.deviceId;

      const session = await this.sessionsRepository.findSessionById(sessionId);
      if (!session) {
        throw new DomainUnauthorizedException('Session not found');
      }

      if (session.iat.getTime() !== payload.iat * 1000) {
        throw new DomainUnauthorizedException('Invalid refresh token');
      }
      const { token: newAccessToken } = this.jwtService.createJwtToken(
        userId,
        deviceId,
        this.jwtConfig.accessTokenExpiresIn,
        false,
      );

      // Always ensure that the refreshed token has a different iat from the current session
      // to invalidate the previous refresh token even if refresh happens within the same second.
      let newRefreshTokenData = this.jwtService.createJwtToken(
        userId,
        deviceId,
        this.jwtConfig.refreshTokenExpiresIn,
        true,
        sessionId,
      );

      // If iat did not change due to same-second issuance, wait briefly and regenerate
      const currentIatSec = Math.floor(session.iat.getTime() / 1000);
      if (
        !newRefreshTokenData.payload.iat ||
        !newRefreshTokenData.payload.exp
      ) {
        throw new Error('Failed to generate new refresh token payload.');
      }

      if (newRefreshTokenData.payload.iat === currentIatSec) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        newRefreshTokenData = this.jwtService.createJwtToken(
          userId,
          deviceId,
          this.jwtConfig.refreshTokenExpiresIn,
          true,
          sessionId,
        );
        if (
          !newRefreshTokenData.payload.iat ||
          !newRefreshTokenData.payload.exp
        ) {
          throw new Error('Failed to regenerate refresh token payload.');
        }
      }

      session.updateDates(
        newRefreshTokenData.payload.iat,
        newRefreshTokenData.payload.exp,
      );
      await this.sessionsRepository.save(session);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenData.token,
      };
    } catch (error) {
      console.log(error);
      throw new DomainUnauthorizedException();
    }
  }
}
