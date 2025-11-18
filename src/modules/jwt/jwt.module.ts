import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '../user-accounts/application/jwt-service';
import { JwtStrategy } from '../user-accounts/guards/bearer/jwt.strategy';
import { JwtConfig } from './jwt.config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService<any, true>) => {
        const jwtConfig = new JwtConfig(configService);
        return {
          secret: jwtConfig.secret,
          signOptions: { expiresIn: jwtConfig.accessTokenExpiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtConfig, JwtService, JwtStrategy],
  exports: [JwtConfig, JwtService, JwtModule],
})
export class JwtAuthModule {}
