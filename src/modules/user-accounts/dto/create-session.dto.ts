import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  deviceName: string;

  @IsNotEmpty()
  @IsString()
  ip: string;

  @IsNotEmpty()
  @IsNumber()
  iat: number;

  @IsNotEmpty()
  @IsNumber()
  exp: number;
}
