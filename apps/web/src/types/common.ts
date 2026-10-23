/** Shared primitive types used across the application. */

export type ID = string;

/** ISO-8601 timestamp string. */
export type ISODateString = string;

export type Nullable<T> = T | null;

export type SortOrder = "asc" | "desc";

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  ok: false;
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface TableFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
}
