export class HttpError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details, message = 'İstek verileri doğrulanamadı.') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message) {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message) {
    super(409, 'CONFLICT', message);
  }
}

export class RouteNotFoundError extends HttpError {
  constructor(method, requestPath) {
    super(404, 'ROUTE_NOT_FOUND', `${method} ${requestPath} için tanımlı bir endpoint bulunamadı.`);
  }
}
