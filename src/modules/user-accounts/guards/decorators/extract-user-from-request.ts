import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface UserContextDto {
  id: string;
  deviceId?: string;
}

export const ExtractUserFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContextDto | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as UserContextDto;

    console.log('🔍 ExtractUserFromRequest:', user);

    // For optional authentication, return null when there's no user
    if (!user || !user.id) {
      return null;
    }

    return user;
  },
);