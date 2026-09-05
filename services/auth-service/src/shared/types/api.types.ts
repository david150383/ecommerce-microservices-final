export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
