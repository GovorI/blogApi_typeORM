import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Not, Repository } from 'typeorm';
import { SessionEntity } from '../domain/session.entity';

export class SessionsRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
  ) {}

  create(data: Partial<SessionEntity>): SessionEntity {
    return this.sessionRepository.create({
      ...data,
      id: data.id || randomUUID(),
    });
  }

  async save(session: SessionEntity): Promise<SessionEntity> {
    return this.sessionRepository.save(session);
  }

  async findSessionById(id: string): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({ where: { id } });
  }

  async findSessionByUserIdAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({ where: { userId, deviceId } });
  }

  async findSessionByDeviceId(deviceId: string): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({ where: { deviceId } });
  }

  async deleteSessionByUserIdAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    await this.sessionRepository.delete({ userId, deviceId });
  }

  async deleteAllSessionsExceptCurrent(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    await this.sessionRepository.delete({
      userId,
      deviceId: Not(currentDeviceId),
    });
  }

  async deleteSessionByDeviceId(deviceId: string): Promise<boolean> {
    const res = await this.sessionRepository.delete({ deviceId });
    return (res.affected ?? 0) > 0;
  }
}
