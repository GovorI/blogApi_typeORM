import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserWithDeviceContextDto } from '../dto/user-context.dto';

export const ExtractUserWithDevice = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithDeviceContextDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
