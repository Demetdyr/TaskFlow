import { ValidationError } from '../errors/http-errors.js';
import { validateAgainstSchema } from '../validators/schema-validator.js';

export function validateRequest({ body: bodySchema, query: querySchema, isPartialBody = false }) {
  return function requestValidator(request, response, next) {
    const validationErrors = [];
    const validatedRequest = {};

    if (bodySchema) {
      const bodyResult = validateAgainstSchema(request.body, bodySchema, { location: 'body', isPartial: isPartialBody });
      validationErrors.push(...bodyResult.errors);
      validatedRequest.body = bodyResult.value;
    }

    if (querySchema) {
      const queryResult = validateAgainstSchema(request.query, querySchema, { location: 'query' });
      validationErrors.push(...queryResult.errors);
      validatedRequest.query = queryResult.value;
    }

    if (validationErrors.length > 0) {
      return next(new ValidationError(validationErrors));
    }

    request.validated = validatedRequest;
    return next();
  };
}
