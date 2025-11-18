import { UserEntity } from '../../domain/user-entity';

export class UserViewDto {
  id: string;
  login: string;
  email: string;
  createdAt: Date;

  static mapToView(user: UserEntity): UserViewDto {
    const dto = new UserViewDto();

    dto.id = user.id;
    dto.login = user.login;
    dto.email = user.email;
    dto.createdAt = user.createdAt;

    return dto;
  }
}
