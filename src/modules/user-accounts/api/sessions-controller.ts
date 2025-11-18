import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ExtractUserWithDevice,
  UserWithDeviceContext,
} from '../guards/decorators/extract-user-with-device.decorator';
import { HybridSessionAuthGuard } from '../guards/bearer/hybrid-session-auth.guard';
import { SessionService } from '../application/session-service';
import { SessionViewDto } from './view-dto/session.view-dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionsSqlQueryRepository } from '../infrastructure/sessions.sql-query-repository';
import { UserContextDto } from '../guards/dto/user-context.dto';
import { ExtractUserFromRequest } from '../guards/decorators/extract-user-from-request';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@ApiTags('security')
@Controller('security')
@ApiBearerAuth()
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    protected readonly sessionsSqlQueryRepository: SessionsSqlQueryRepository,
  ) {}

  @Get('devices')
  @UseGuards(HybridSessionAuthGuard)
  @ApiOperation({
    summary: 'Get all active sessions',
    description:
      'Returns all active sessions for the current user. Supports both Bearer token and refresh token authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: [SessionViewDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveSessions(
    @ExtractUserWithDevice() user: UserWithDeviceContext,
  ): Promise<SessionViewDto[] | null> {
    return this.sessionsSqlQueryRepository.getAllSessions(user.id);
  }

  @Delete('devices/:deviceId')
  @UseGuards(HybridSessionAuthGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Terminate specific session',
    description:
      'Terminate session by device ID. Cannot terminate current session. Supports both Bearer token and refresh token authentication.',
  })
  @ApiResponse({ status: 204, description: 'Session terminated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot terminate current session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(
    @Param('deviceId') deviceId: string,
    @ExtractUserWithDevice() user: UserWithDeviceContext,
  ): Promise<void> {
    console.log('🔍 SessionsController deleteSession called:', {
      userId: user.id,
      deviceId,
      currentDeviceId: user.deviceId,
    });

    try {
      // Forbid deleting current session
      if (user.deviceId === deviceId) {
        throw new DomainException({
          code: DomainExceptionCode.Forbidden,
          message: 'Cannot delete current session',
        });
      }
      await this.sessionService.deleteSession(user.id, deviceId);
      console.log('✅ SessionsController deleteSession completed successfully');
    } catch (error) {
      // Если это DomainException (404, 403), пробрасываем как есть
      if (error instanceof DomainException) {
        throw error;
      }
      // SQL ошибки и другие пробрасываем дальше
      console.error('💥 SessionsController deleteSession SQL error:', error);
      throw error;
    }
  }

  @Delete('devices')
  @UseGuards(HybridSessionAuthGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Terminate all other sessions',
    description:
      'Terminate all sessions except the current one. Supports both Bearer token and refresh token authentication.',
  })
  @ApiResponse({
    status: 204,
    description: 'All other sessions terminated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAllOtherSessions(
    @ExtractUserWithDevice() user: UserWithDeviceContext,
  ): Promise<void> {
    console.log('🔍 SessionsController deleteAllOtherSessions called:', {
      userId: user.id,
      deviceId: user.deviceId,
    });

    try {
      await this.sessionService.deleteAllSessionsExceptCurrent(
        user.id,
        user.deviceId,
      );
      console.log(
        '✅ SessionsController deleteAllOtherSessions completed successfully',
      );
    } catch (error) {
      // Если это DomainException, пробрасываем как есть
      if (error instanceof DomainException) {
        throw error;
      }
      // SQL ошибки и другие пробрасываем дальше
      console.error('💥 SessionsController deleteAllOtherSessions SQL error:', error);
      throw error;
    }
  }
}
