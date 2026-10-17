import { HttpError } from '../errors/http-errors.js';

const bodyParserErrorsByType = {
  'entity.parse.failed': new HttpError(400, 'INVALID_JSON', 'İstek gövdesi geçerli bir JSON değil. Sözdizimini kontrol edin.'),
  'entity.too.large': new HttpError(413, 'PAYLOAD_TOO_LARGE', 'İstek gövdesi izin verilen 100 KB sınırını aşıyor.'),
  'encoding.unsupported': new HttpError(415, 'UNSUPPORTED_ENCODING', 'İstek gövdesinin sıkıştırma biçimi desteklenmiyor.'),
  'charset.unsupported': new HttpError(415, 'UNSUPPORTED_CHARSET', 'Yalnızca UTF-8 karakter kodlaması desteklenir.'),
};

const unprocessableRequestMessage = 'İstek işlenemedi. Gönderilen veriyi ve başlıkları kontrol edin.';

const internalServerError = new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');

function toHttpError(error) {
  if (error instanceof HttpError) {
    return error;
  }
  if (bodyParserErrorsByType[error.type]) {
    return bodyParserErrorsByType[error.type];
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return new HttpError(error.status, 'BAD_REQUEST', unprocessableRequestMessage);
  }
  return internalServerError;
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const httpError = toHttpError(error);
  if (httpError === internalServerError) {
    console.error(error);
  }

  const errorBody = { code: httpError.code, message: httpError.message };
  if (httpError.details.length > 0) {
    errorBody.details = httpError.details;
  }

  return response.status(httpError.statusCode).json({ error: errorBody });
}
