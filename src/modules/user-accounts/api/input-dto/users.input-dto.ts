import { CreateUserDto } from '../../dto/create-user.dto';
import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserInputDto implements CreateUserDto {
  @IsString()
  @Length(3, 10)
  login: string;

  @IsString()
  @Length(6, 20)
  password: string;

  @IsEmail()
  email: string;
}
