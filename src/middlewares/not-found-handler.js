import { RouteNotFoundError } from '../errors/http-errors.js';

export function notFoundHandler(request, response, next) {
  next(new RouteNotFoundError(request.method, request.path));
}
