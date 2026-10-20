export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = 'Could not validate credentials') =>
  new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);
export const conflict = (message) => new AppError(409, message);
export const badGateway = (message) => new AppError(502, message);
