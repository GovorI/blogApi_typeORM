import { ApiProperty } from '@nestjs/swagger';
// import { ISqlSession } from '../../infrastructure/sessions.repository';
import { SessionEntity } from '../../domain/session.entity';

export class SessionViewDto {
  @ApiProperty({
    description: 'IP address of the device',
    example: '192.168.1.100',
  })
  ip: string;

  @ApiProperty({
    description: 'Device name/title',
    example: 'Chrome on Windows',
  })
  title: string;

  @ApiProperty({
    description: 'Last active date in ISO format',
    example: '2025-01-16T10:30:00.000Z',
  })
  lastActiveDate: string;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device-uuid-123',
  })
  deviceId: string;

  static mapToSessionViewDto(sessions: SessionEntity[]): SessionViewDto[] {
    return sessions.map((session: SessionEntity) => {
      return {
        ip: session.ip,
        title: session.deviceName,
        lastActiveDate: session.iat.toISOString(),
        deviceId: session.deviceId,
      };
    });
  }
}
