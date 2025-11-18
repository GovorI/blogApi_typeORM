import { IsEmail, IsString, Length } from 'class-validator';

export class RegistrationInputDto {
  @IsString()
  @Length(3, 10)
  login: string;

  @IsString()
  @Length(6, 20)
  password: string;

  @IsEmail()
  email: string;
}
