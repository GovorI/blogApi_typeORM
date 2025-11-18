import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserWithDeviceContext {
  id: string;
  deviceId: string;
}

export const ExtractUserWithDevice = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithDeviceContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
