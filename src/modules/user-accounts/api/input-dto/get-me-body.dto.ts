import { IsOptional, IsString } from 'class-validator';

export class GetMeBodyDto {
  @IsOptional()
  @IsString()
  accessToken?: string;
}
