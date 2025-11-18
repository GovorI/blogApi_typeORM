import { IsNotEmpty, IsString } from 'class-validator';
import { IsConfirmationCodeValid } from '../../validators/confirmation-code.validator';

export class ConfirmationEmailInputDto {
  @IsNotEmpty()
  @IsString()
  @IsConfirmationCodeValid({
    message: 'The confirmation code is incorrect, expired or already applied',
  })
  code: string;
}
