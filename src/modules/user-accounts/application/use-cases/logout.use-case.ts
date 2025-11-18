import { CommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException as DomainUnauthorizedException } from '../../../../core/domain';
import { JwtService } from '../jwt-service';
import { SessionsSqlRepository } from '../../infrastructure/sessions.sql-repository';

export class LogoutUserCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(LogoutUserCommand)
export class LogoutUserUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionsRepository: SessionsSqlRepository,
  ) {}

  async execute(command: LogoutUserCommand) {
    const payload = await this.jwtService.verifyToken(command.refreshToken);
    if (!payload || !payload.deviceId || !payload.sub || !payload.iat) {
      throw new DomainUnauthorizedException('Invalid token payload');
    }
    const userId = payload.sub;
    const deviceId = payload.deviceId;

    const session =
      await this.sessionsRepository.findSessionByUserIdAndDeviceId(
        userId,
        deviceId,
      );

    if (!session) {
      throw new DomainUnauthorizedException('Session not found');
    }

    if (session.iat.getTime() !== payload.iat * 1000) {
      throw new DomainUnauthorizedException('Invalid refresh token');
    }

    await this.sessionsRepository.deleteSessionByUserIdAndDeviceId(
      userId,
      deviceId,
    );
  }
}
