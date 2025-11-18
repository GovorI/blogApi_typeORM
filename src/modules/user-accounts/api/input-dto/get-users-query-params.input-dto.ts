//...

//dto для запроса списка юзеров с пагинацией, сортировкой, фильтрами
import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';

export class GetUsersQueryParams extends BaseQueryParams {
  sortBy: UsersSortBy = UsersSortBy.CreatedAt;
  searchLoginTerm: string | null = null;
  searchEmailTerm: string | null = null;
}

export enum UsersSortBy {
  Login = 'login',
  Email = 'email',
  CreatedAt = 'createdAt',
}
