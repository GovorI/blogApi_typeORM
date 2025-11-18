import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RegistrationInputDto } from './input-dto/registration.input-dto';
import { PasswordRecoveryInputDto } from './input-dto/password-recovery.input-dto';
import { Request, Response } from 'express';
import { UserContextDto } from '../guards/dto/user-context.dto';
import { ExtractUserFromRequest } from '../guards/decorators/extract-user-from-request';
import { LocalAuthGuard } from '../guards/local/local-auth.guard';
import { ConfirmationEmailInputDto } from './input-dto/confirmation-email.input.dto';
import { NewPasswordInputDto } from './input-dto/new-password.input-dto';
import { EmailResendingInputDto } from './input-dto/email-resending.input-dto';
import { UnauthorizedException as DomainUnauthorizedException } from '../../../core/domain/domain.exception';
import { LoginResponseViewDto } from './view-dto/login-response.view-dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoreConfig } from '../../../core/core.config';
import { CommandBus } from '@nestjs/cqrs';
import { LoginUserCommand } from '../application/use-cases/login-user.use-case';
import { LoginResultDto } from '../dto/login-result.dto';
import { LogoutUserCommand } from '../application/use-cases/logout.use-case';
import { PasswordRecoveryCommand } from '../application/use-cases/password-recovery.use-case';
import { NewPasswordCommand } from '../application/use-cases/new-password.use-case';
import { RegistrationConfirmationCommand } from '../application/use-cases/registration-confirmation.use-case';
import { RegistrationCommand } from '../application/use-cases/registration.use-case';
import { RegistrationEmailResendingCommand } from '../application/use-cases/registration-email-resending.use-case';
import { GetMeCommand } from '../application/use-cases/get-me.use-case';
import { GetMeBodyDto } from './input-dto/get-me-body.dto';
import { MeResponseViewDto } from './view-dto/me-response.view-dto';
import { RefreshTokenCommand } from '../application/use-cases/refresh-token.use-case';
import { RateLimitGuard } from '../../../core/guards/rate-limit.guard';
import { RateLimit } from '../../../core/decorators/rate-limit.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly coreConfig: CoreConfig,
    private readonly commandBus: CommandBus,
  ) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: this.coreConfig.env !== 'testing', // Disable secure in testing
      path: '/',
      sameSite: 'strict' as const,
    };
  }

  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user and return access token in body. Refresh token is set as httpOnly cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseViewDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @UseGuards(RateLimitGuard)
  @UseGuards(LocalAuthGuard)
  @RateLimit({ keyPrefix: 'login' })
  @HttpCode(200)
  async login(
    @ExtractUserFromRequest() user: UserContextDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseViewDto> {
    const userAgent = req.headers['user-agent'] || ('unknown user' as string);
    const ip = req.ip || 'unknown';
    const loginResult: LoginResultDto = await this.commandBus.execute(
      new LoginUserCommand(user.id, userAgent, ip),
    );
    res.cookie(
      'refreshToken',
      loginResult.refreshToken,
      this.getCookieOptions(),
    );
    console.log('tokens: ', loginResult);
    return {
      accessToken: loginResult.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'User logout',
    description: 'Clear refresh token cookie and invalidate refresh token',
  })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: string | undefined = req.cookies?.refreshToken as
      | string
      | undefined;
    if (!refreshToken) {
      throw new DomainUnauthorizedException();
    }

    try {
      await this.commandBus.execute(new LogoutUserCommand(refreshToken));
      res.clearCookie('refreshToken');
      return;
    } catch (error) {
      console.log(error);
      res.clearCookie('refreshToken');
      throw new DomainUnauthorizedException();
    }
  }

  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate new access and refresh tokens using refresh token from cookies',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: LoginResponseViewDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseViewDto> {
    const refreshToken: string | undefined = req.cookies?.refreshToken as
      | string
      | undefined;
    if (!refreshToken) {
      throw new DomainUnauthorizedException();
    }

    const refreshResult: { accessToken: string; refreshToken: string } =
      await this.commandBus.execute(new RefreshTokenCommand(refreshToken));
    console.log('refreshResult: ', refreshResult);
    res.cookie(
      'refreshToken',
      refreshResult.refreshToken,
      this.getCookieOptions(),
    );

    return {
      accessToken: refreshResult.accessToken,
    };
  }

  @Post('password-recovery')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'passwordRecovery' })
  @HttpCode(204)
  async passwordRecovery(@Body() dto: PasswordRecoveryInputDto) {
    await this.commandBus.execute(new PasswordRecoveryCommand(dto.email));
    return;
  }

  @Post('new-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'newPassword' })
  @HttpCode(204)
  async newPassword(@Body() dto: NewPasswordInputDto) {
    await this.commandBus.execute(
      new NewPasswordCommand(dto.recoveryCode, dto.newPassword),
    );
  }

  @Post('registration-confirmation')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'registrationConfirmation' })
  @HttpCode(204)
  async registrationConfirmation(@Body() dto: ConfirmationEmailInputDto) {
    await this.commandBus.execute(
      new RegistrationConfirmationCommand(dto.code),
    );
  }

  @Post('registration')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'registration' })
  @HttpCode(204)
  async registration(@Body() dto: RegistrationInputDto, @Req() req: Request) {
    await this.commandBus.execute(new RegistrationCommand(dto, req.ip));
  }

  @Post('registration-email-resending')
  @UseGuards(RateLimitGuard)
  @RateLimit({ keyPrefix: 'registrationEmailResending' })
  @HttpCode(204)
  async registrationEmailResending(
    @Body() dto: EmailResendingInputDto,
    @Req() req: Request,
  ) {
    await this.commandBus.execute(
      new RegistrationEmailResendingCommand(dto, req.ip),
    );
  }

  @Get('me')
  @HttpCode(200)
  async getMe(
    @Req() req: Request,
    @Body() body?: GetMeBodyDto,
  ): Promise<MeResponseViewDto> {
    const authHeader = (req.headers['authorization'] ||
      req.headers['Authorization']) as string | undefined;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length);
    }

    if (!token && body && typeof body.accessToken === 'string') {
      token = body.accessToken;
    }

    const q = req.query as { accessToken?: string } & typeof req.query;
    if (!token && q && typeof q.accessToken === 'string') {
      token = q.accessToken;
    }

    if (!token) {
      throw new DomainUnauthorizedException();
    }

    return await this.commandBus.execute(new GetMeCommand(token));
  }
}
