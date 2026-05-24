export interface ApiErrorDetail {
  field?: string;

  issue?: string;
}

export interface ApiError {
  code: string;

  message: string;

  details?: ApiErrorDetail[];
}

export interface ApiSuccessResponse<T> {
  data: T;

  message: string;

  meta?: any;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: PaginationMeta;
}
