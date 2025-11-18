import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserNotFoundException } from '../../../core/domain';
import { GetUsersQueryParams } from '../api/input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { ISqlUser } from './users.sql-repository';
import { SqlUserAdapter } from './adapters/sql-user.adapter';
import { UserViewDto } from '../api/view-dto/user.view-dto';
import { SortDirection } from '../../../core/dto/base.query-params.input-dto';

@Injectable()
export class UsersSqlQueryRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}
  async getByIdOrNotFoundFail(id: string): Promise<UserViewDto> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT * FROM "Users" WHERE "id"::text = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawUsers[0]) {
      throw new UserNotFoundException('User not found');
    }
    return UserViewDto.mapToView(SqlUserAdapter.toEntity(rawUsers[0]));
  }

  async getMe(
    id: string,
  ): Promise<{ email: string; login: string; userId: string }> {
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT * FROM "Users" WHERE "id"::text = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (!rawUsers[0]) {
      throw new UserNotFoundException('User not found');
    }
    return {
      email: rawUsers[0].email,
      login: rawUsers[0].login,
      userId: rawUsers[0].id,
    };
  }

  async getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    // Строим WHERE условие для фильтрации
    const whereClauses: string[] = ['("deletedAt" IS NULL)'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Добавляем фильтрацию по searchLoginTerm и searchEmailTerm
    if (query.searchLoginTerm || query.searchEmailTerm) {
      const orConditions: string[] = [];

      if (query.searchLoginTerm) {
        queryParams.push(`%${query.searchLoginTerm}%`);
        orConditions.push(`login ILIKE $${paramIndex}`);
        paramIndex++;
      }

      if (query.searchEmailTerm) {
        queryParams.push(`%${query.searchEmailTerm}%`);
        orConditions.push(`email ILIKE $${paramIndex}`);
        paramIndex++;
      }

      whereClauses.push(`(${orConditions.join(' OR ')})`);
    }

    const whereClause = whereClauses.join(' AND ');

    // Считаем общее количество с учетом фильтров
    const totalCountRes = await this.dataSource.query<{ count: number }>(
      `SELECT COUNT(*) FROM "Users" WHERE ${whereClause}`,
      queryParams,
    );
    const totalCount: number =
      totalCountRes[0]?.count != null ? Number(totalCountRes[0].count) : 0;

    // Определяем поле и направление сортировки
    const allowedSortFields = ['login', 'email', 'createdAt'];
    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';
    const sortDirection =
      query.sortDirection === SortDirection.Asc ? 'ASC' : 'DESC';

    // Добавляем параметры для LIMIT и OFFSET
    queryParams.push(query.pageSize);
    queryParams.push((query.pageNumber - 1) * query.pageSize);

    // Получаем пользователей с фильтрацией и пагинацией
    const rawUsers: ISqlUser[] = await this.dataSource.query(
      `SELECT * FROM "Users"
       WHERE ${whereClause} 
       ORDER BY "${sortBy}" ${sortDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams,
    );

    const items = rawUsers.map((user) =>
      UserViewDto.mapToView(SqlUserAdapter.toEntity(user)),
    );

    return PaginatedViewDto.mapToView({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
      items,
    });
  }
}
