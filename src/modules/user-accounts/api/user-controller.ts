import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserViewDto } from './view-dto/user.view-dto';
import { UsersService } from '../application/user-service';
import { CreateUserInputDto } from './input-dto/users.input-dto';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from './input-dto/get-users-query-params.input-dto';
import { BasicAuthGuard } from '../guards/basic/basic-auth.guard';
import { UsersQueryRepository } from '../infrastructure/users.query-repository';

@Controller('sa')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersQueryRepository: UsersQueryRepository,
  ) {}

  @Get('users')
  @UseGuards(BasicAuthGuard)
  async getAll(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.usersQueryRepository.getAll(query);
  }

  @Post('users')
  @UseGuards(BasicAuthGuard)
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    const userId = await this.usersService.createUser(body);
    console.log(' User created successfully, ID:', userId);
    return this.usersQueryRepository.getByIdOrNotFoundFail(userId);
  }

  // @Get('users/:id') //todo check the doc if this lever is needed
  // @UseGuards(BasicAuthGuard)
  // async getById(
  //   @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  // ): Promise<UserViewDto> {
  //   return this.usersQueryRepository.getByIdOrNotFoundFail(id);
  // }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deleteUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.usersService.deleteUser(id);
  }
}
