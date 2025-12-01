import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../infrastructure/sessions.repository';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';
import { UserWithDeviceContextDto } from '../guards/dto/user-context.dto';

@Injectable()
export class SessionService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async deleteSession(
    user: UserWithDeviceContextDto,
    deviceId: string,
  ): Promise<void> {
    if (user.deviceId === deviceId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Cannot delete current session',
      });
    }
    const session =
      await this.sessionsRepository.findSessionByDeviceId(deviceId);

    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Session not found',
      });
    }

    if (session.userId !== user.id) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Cannot delete session that belongs to another user',
      });
    }

    const isDeleted =
      await this.sessionsRepository.deleteSessionByDeviceId(deviceId);
    if (!isDeleted) {
      // Эта ошибка не должна возникать, если сессия была найдена, но на всякий случай
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Session not found after attempting to delete',
      });
    }
  }

  async deleteAllSessionsExceptCurrent(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    if (!userId || !currentDeviceId) {
      throw new Error('User ID and Current Device ID must be provided');
    }
    await this.sessionsRepository.deleteAllSessionsExceptCurrent(
      userId,
      currentDeviceId,
    );
  }
}
