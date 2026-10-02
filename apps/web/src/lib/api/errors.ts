export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
