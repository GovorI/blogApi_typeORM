import { IsEmail, IsString, Matches } from 'class-validator';
import { IsEmailValid } from '../../validators/email.validator';

export class EmailResendingInputDto {
  @IsString()
  @IsEmail()
  @Matches(/^[\w-.+]+@([\w-]+\.)+[\w-]{2,4}$/, {
    message: 'email must be valid',
  })
  @IsEmailValid()
  email: string;
}
