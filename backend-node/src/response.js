// 和 Go 端 pkg/response 保持一致，方便前端复用
const { isErrorCode, getErrorMessage } = require('./i18n/errors');

function send(res, statusCode, body) {
  const payload = {
    ...body,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(payload);
}

function getReqLang(res) {
  const req = res?.req;
  const header = req?.headers?.['accept-language'];
  if (header && typeof header === 'string' && header.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'zh';
}

function resolveErrorPayload(res, defaultCode, arg1, arg2) {
  const lang = getReqLang(res);
  let code = defaultCode;
  let message = '';
  let details = undefined;

  if (arg2 !== undefined) {
    code = arg1 || defaultCode;
    if (typeof arg2 === 'string') {
      message = arg2;
    } else {
      details = arg2;
      message = getErrorMessage(code, lang);
    }
  } else if (arg1 !== undefined) {
    if (typeof arg1 === 'string' && isErrorCode(arg1)) {
      code = arg1;
      message = getErrorMessage(code, lang);
    } else {
      message = typeof arg1 === 'string' ? arg1 : String(arg1 || '');
      if (isErrorCode(message)) {
        code = message;
        message = getErrorMessage(code, lang);
      }
    }
  } else {
    message = getErrorMessage(code, lang);
  }

  return { code, message, details };
}

function success(res, data) {
  send(res, 200, { success: true, data });
}

function created(res, data) {
  send(res, 201, { success: true, data });
}

function successWithPagination(res, items, total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 0;
  send(res, 200, {
    success: true,
    data: {
      items,
      pagination: { page, page_size: pageSize, total, total_pages: totalPages },
    },
  });
}

function error(res, statusCode, code, message, details) {
  send(res, statusCode, {
    success: false,
    error: { code, message, ...(details && { details }) },
  });
}

function badRequest(res, arg1, arg2) {
  const { code, message, details } = resolveErrorPayload(res, 'BAD_REQUEST', arg1, arg2);
  error(res, 400, code, message, details);
}

function notFound(res, arg1, arg2) {
  const { code, message, details } = resolveErrorPayload(res, 'NOT_FOUND', arg1, arg2);
  error(res, 404, code, message, details);
}

function forbidden(res, arg1, arg2) {
  const { code, message, details } = resolveErrorPayload(res, 'FORBIDDEN', arg1, arg2);
  error(res, 403, code, message, details);
}

function internalError(res, arg1, arg2) {
  const { code, message, details } = resolveErrorPayload(res, 'INTERNAL_ERROR', arg1, arg2);
  error(res, 500, code, message, details);
}

function serviceUnavailable(res, arg1, arg2) {
  const { code, message, details } = resolveErrorPayload(res, 'SERVICE_UNAVAILABLE', arg1, arg2);
  error(res, 503, code, message, details);
}

module.exports = {
  success,
  created,
  successWithPagination,
  error,
  badRequest,
  notFound,
  forbidden,
  internalError,
  serviceUnavailable,
};
