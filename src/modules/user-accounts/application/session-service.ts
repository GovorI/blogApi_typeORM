import { Injectable } from '@nestjs/common';
import { SessionsSqlRepository } from '../infrastructure/sessions.sql-repository';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Injectable()
export class SessionService {
  constructor(private readonly sessionsRepository: SessionsSqlRepository) {}

  async deleteSession(userId: string, deviceId: string): Promise<void> {
    const session =
      await this.sessionsRepository.findSessionByDeviceId(deviceId);

    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Session not found',
      });
    }

    if (session.userId !== userId) {
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
