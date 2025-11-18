import { IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsEmailOrUsername } from '../../../../core/decorators/is-email-or-username.decorator';

export class LoginInputDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmailOrUsername({ message: 'Invalid login credentials' })
  loginOrEmail: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(6, 20)
  password: string;
}
