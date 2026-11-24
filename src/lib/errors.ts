export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "AppError";
  }
}

export function safeErrorMessage(error: unknown) {
  return error instanceof AppError ? error.message : "The request could not be completed. Check the server configuration and try again.";
}