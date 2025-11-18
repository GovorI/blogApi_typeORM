import {
  DomainException,
  Extension,
} from '../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../core/exceptions/domain-exception-codes';

export class UserNotFoundException extends DomainException {
  constructor(message: string = 'User not found') {
    super({
      code: DomainExceptionCode.NotFound,
      message,
    });
  }
}

export class LoginAlreadyExist extends DomainException {
  constructor(message: string = 'Login already exists') {
    super({
      code: DomainExceptionCode.LoginAlreadyExisted,
      message,
    });
  }
}

export class EmailAlreadyExist extends DomainException {
  constructor(message: string = 'Login already exists') {
    super({
      code: DomainExceptionCode.EmailAlreadyExisted,
      message,
    });
  }
}

export class PostNotFoundException extends DomainException {
  constructor(message: string = 'Post not found') {
    super({
      code: DomainExceptionCode.NotFound,
      message,
    });
  }
}

export class BlogNotFoundException extends DomainException {
  constructor(message: string = 'Blog not found') {
    super({
      code: DomainExceptionCode.NotFound,
      message,
    });
  }
}

export class CommentNotFoundException extends DomainException {
  constructor(message: string = 'Comment not found') {
    super({
      code: DomainExceptionCode.NotFound,
      message,
    });
  }
}

export class ValidationException extends DomainException {
  constructor(
    message: string = 'Validation failed',
    extensions: Extension[] = [],
  ) {
    super({
      code: DomainExceptionCode.ValidationError,
      message,
      extensions,
    });
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string = 'Unauthorized access') {
    super({
      code: DomainExceptionCode.Unauthorized,
      message,
    });
  }
}

export class TooManyRequestsException extends DomainException {
  constructor(message: string = 'Too many requests') {
    super({
      code: DomainExceptionCode.TooMenyRequeses,
      message,
    });
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = 'Access forbidden') {
    super({
      code: DomainExceptionCode.Forbidden,
      message,
    });
  }
}

export class BadRequestException extends DomainException {
  constructor(message: string = 'Bad request', extensions = []) {
    super({
      code: DomainExceptionCode.BadRequest,
      message,
      extensions,
    });
  }
}
