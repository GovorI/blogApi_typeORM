import { ApiProperty } from '@nestjs/swagger';

/**
 * Login response DTO
 * Contains only the access token in response body
 * Refresh token is set as httpOnly cookie
 */
export class LoginResponseViewDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
