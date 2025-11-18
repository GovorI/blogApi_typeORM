import { randomUUID } from 'crypto';
import { CommandHandler } from '@nestjs/cqrs';
import { JwtService } from '../jwt-service';
import { JwtConfig } from '../../../jwt/jwt.config';
import { SessionsSqlRepository } from '../../infrastructure/sessions.sql-repository';
import { SessionEntity } from '../../domain/session-entity';

export class LoginUserCommand {
  constructor(
    public readonly userId: string,
    public readonly deviceName: string,
    public readonly ip: string,
  ) {}
}

@CommandHandler(LoginUserCommand)
export class LoginUserUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtConfig: JwtConfig,
    private readonly sessionsRepository: SessionsSqlRepository,
  ) {}

  async execute(command: LoginUserCommand) {
    try {
      const deviceId = randomUUID();
      const sessionId = randomUUID();

      const { token: accessToken } = this.jwtService.createJwtToken(
        command.userId,
        deviceId,
        this.jwtConfig.accessTokenExpiresIn,
        false,
      );

      const { token: refreshToken, payload: refreshPayload } =
        this.jwtService.createJwtToken(
          command.userId,
          deviceId,
          this.jwtConfig.refreshTokenExpiresIn,
          true,
          sessionId,
        );

      if (!refreshPayload || !refreshPayload.iat || !refreshPayload.exp) {
        throw new Error('Invalid refresh token payload');
      }

      const session = new SessionEntity({
        id: sessionId,
        userId: command.userId,
        deviceId: deviceId,
        deviceName: command.deviceName,
        ip: command.ip,
        iat: new Date(refreshPayload.iat * 1000),
        exp: new Date(refreshPayload.exp * 1000),
      });

      await this.sessionsRepository.save(session);

      return {
        accessToken,
        refreshToken,
      };
    } catch (e) {
      console.error('Error save session to database:', e);
      throw e;
    }
  }
}
