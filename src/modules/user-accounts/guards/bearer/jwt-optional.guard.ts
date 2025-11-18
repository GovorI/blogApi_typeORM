import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    // If there's no user (token not provided or invalid), just return null
    // instead of throwing an error
    return user || null;
  }
}
