import { IsUUID } from 'class-validator';

/**
 * user object for the jwt token and for transfer from the request object
 */
export class UserContextDto {
  @IsUUID(4, { message: 'Invalid user ID format' })
  id: string;
  deviceId?: string;
}

export type Nullable<T> = { [P in keyof T]: T[P] | null };
