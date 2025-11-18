import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseBody } from './error-response-body.type';
import { DomainExceptionCode } from '../domain-exception-codes';
import { CoreConfig } from '../../core.config';


//https://docs.nestjs.com/exception-filters#exception-filters-1
//Все ошибки
@Injectable()
@Catch()
export class AllHttpExceptionsFilter implements ExceptionFilter {
  constructor(private readonly coreConfig: CoreConfig) { }
  catch(exception: any, host: ArgumentsHost): void {
    //ctx нужен, чтобы получить request и response (express). Это из документации, делаем по аналогии
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    //Если сработал этот фильтр, то пользователю улетит 500я ошибка
    // const message = exception.message || 'Unknown exception occurred.';
    // const status = HttpStatus.INTERNAL_SERVER_ERROR;
    // const responseBody = this.buildResponseBody(request.url, message);

    // Контролирует статус и сообщение
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = DomainExceptionCode.InternalServerError;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      code = this.mapHttpStatusToDomainCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Формируем тело ответа
    const responseBody = this.buildResponseBody(
      request.url,
      message,
      code
    );

    response.status(status).json(responseBody);
  }

  private mapHttpStatusToDomainCode(status: number): number {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return DomainExceptionCode.BadRequest;
      case HttpStatus.UNAUTHORIZED:
        return DomainExceptionCode.Unauthorized;
      case HttpStatus.FORBIDDEN:
        return DomainExceptionCode.Forbidden;
      case HttpStatus.NOT_FOUND:
        return DomainExceptionCode.NotFound;
      default:
        return DomainExceptionCode.InternalServerError;
    }
  }

  private buildResponseBody(
    requestUrl: string,
    message: string,
    code: number
  ): ErrorResponseBody {
    const isProduction = this.coreConfig.env === 'production';
    const showDetails = this.coreConfig.sendInternalServerErrorDetails;

    return {
      timestamp: new Date().toISOString(),
      path: isProduction ? null : requestUrl,
      message: isProduction ? 'Internal server error' : (showDetails ? message : 'Internal server error'),
      extensions: [],
      code: code,
    };
  }
}
