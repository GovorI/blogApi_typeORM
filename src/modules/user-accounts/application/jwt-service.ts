import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtPayload } from '../domain/jwt-payload.interface';
import { randomUUID } from 'crypto';
import { JwtConfig } from '../../jwt/jwt.config';

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly jwtConfig: JwtConfig,
  ) {}

  createJwtToken(
    userId: string,
    deviceId: string,
    lifeTime: string,
    isRefreshToken: boolean = false,
    sessionId?: string,
  ): { token: string; payload: Partial<JwtPayload> } {
    const payload: Partial<JwtPayload> = {
      sub: userId,
      deviceId,
    };

    if (isRefreshToken) {
      payload.jti = sessionId || randomUUID(); // JWT ID claim
    }

    const token = this.jwtService.sign(payload, {
      secret: this.jwtConfig.secret,
      expiresIn: lifeTime,
    });

    const dekodedPayload: JwtPayload = this.jwtService.decode(token);

    return {
      token: token,
      payload: dekodedPayload,
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return Promise.resolve(
        this.jwtService.verify<JwtPayload>(token, {
          secret: this.jwtConfig.secret,
        }),
      );
    } catch (error) {
      console.log(error);
      throw new Error('Invalid token');
    }
  }

  async decodeToken(token: string): Promise<JwtPayload | null> {
    const decoded: JwtPayload | null = this.jwtService.decode(token);
    return Promise.resolve(decoded);
  }
}
