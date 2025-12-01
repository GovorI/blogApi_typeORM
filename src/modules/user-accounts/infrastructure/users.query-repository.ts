import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource } from 'typeorm';
import { UserNotFoundException } from '../../../core/domain';
import { GetUsersQueryParams } from '../api/input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { ISqlUser } from './users.repository';
// import { SqlUserAdapter } from './adapters/sql-user.adapter';
import { UserViewDto } from '../api/view-dto/user.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';
import { UserEntity } from '../domain/user-entity';

@Injectable()
export class UsersQueryRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}
  async getByIdOrNotFoundFail(id: string): Promise<UserViewDto> {
    const user = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new UserNotFoundException('User not found');
    }

    return UserViewDto.mapToView(user);
  }

  async getMe(
    id: string,
  ): Promise<{ email: string; login: string; userId: string }> {
    const user = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new UserNotFoundException('User not found');
    }
    return {
      email: user.email,
      login: user.login,
      userId: user.id,
    };
  }

  async getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    const usersRepository = this.dataSource.getRepository(UserEntity);

    const baseQuery = usersRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (query.searchLoginTerm || query.searchEmailTerm) {
      baseQuery.andWhere(
        new Brackets((qb) => {
          if (query.searchLoginTerm) {
            qb.where('user.login ILIKE :loginTerm', {
              loginTerm: `%${query.searchLoginTerm}%`,
            });
          }

          if (query.searchEmailTerm) {
            const nextMethod = query.searchLoginTerm ? 'orWhere' : 'where';
            qb[nextMethod]('user.email ILIKE :emailTerm', {
              emailTerm: `%${query.searchEmailTerm}%`,
            });
          }
        }),
      );
    }

    const allowedSortFields = {
      login: 'user.login',
      email: 'user.email',
      createdAt: 'user.createdAt',
    } as const;

    const sortBy =
      allowedSortFields[query.sortBy] ?? allowedSortFields.createdAt;
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    const paginatedQuery = baseQuery.clone().orderBy(sortBy, sortDirection);

    paginatedQuery.skip(query.calculateSkip()).take(query.pageSize);

    const [users, totalCount] = await Promise.all([
      paginatedQuery.getMany(),
      baseQuery.clone().getCount(),
    ]);

    const items = users.map((user) => UserViewDto.mapToView(user));

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }

  // async getAll(
  //   query: GetUsersQueryParams,
  // ): Promise<PaginatedViewDto<UserViewDto[]>> {
  //   // Строим WHERE условие для фильтрации
  //   const whereClauses: string[] = ['("deletedAt" IS NULL)'];
  //   const queryParams: any[] = [];
  //   let paramIndex = 1;
  //
  //   // Добавляем фильтрацию по searchLoginTerm и searchEmailTerm
  //   if (query.searchLoginTerm || query.searchEmailTerm) {
  //     const orConditions: string[] = [];
  //
  //     if (query.searchLoginTerm) {
  //       queryParams.push(`%${query.searchLoginTerm}%`);
  //       orConditions.push(`login ILIKE $${paramIndex}`);
  //       paramIndex++;
  //     }
  //
  //     if (query.searchEmailTerm) {
  //       queryParams.push(`%${query.searchEmailTerm}%`);
  //       orConditions.push(`email ILIKE $${paramIndex}`);
  //       paramIndex++;
  //     }
  //
  //     whereClauses.push(`(${orConditions.join(' OR ')})`);
  //   }
  //
  //   const whereClause = whereClauses.join(' AND ');
  //
  //   // Считаем общее количество с учетом фильтров
  //   const totalCountRes = await this.dataSource.query<{ count: number }>(
  //     `SELECT COUNT(*) FROM "Users" WHERE ${whereClause}`,
  //     queryParams,
  //   );
  //   const totalCount: number =
  //     totalCountRes[0]?.count != null ? Number(totalCountRes[0].count) : 0;
  //
  //   // Определяем поле и направление сортировки
  //   const allowedSortFields = ['login', 'email', 'createdAt'];
  //   const sortBy = allowedSortFields.includes(query.sortBy)
  //     ? query.sortBy
  //     : 'createdAt';
  //   const sortDirection =
  //     query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';
  //
  //   // Добавляем параметры для LIMIT и OFFSET
  //   queryParams.push(query.pageSize);
  //   queryParams.push((query.pageNumber - 1) * query.pageSize);
  //
  //   // Получаем пользователей с фильтрацией и пагинацией
  //   const rawUsers: ISqlUser[] = await this.dataSource.query(
  //     `SELECT * FROM "Users"
  //      WHERE ${whereClause}
  //      ORDER BY "${sortBy}" ${sortDirection}
  //      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
  //     queryParams,
  //   );
  //
  //   const items = rawUsers.map((user) =>
  //     UserViewDto.mapToView(SqlUserAdapter.toEntity(user)),
  //   );
  //
  //   return PaginatedViewDto.mapToView({
  //     pageNumber: query.pageNumber,
  //     pageSize: query.pageSize,
  //     totalCount,
  //     items,
  //   });
  // }
}
