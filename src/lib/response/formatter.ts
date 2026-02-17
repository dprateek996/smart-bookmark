export type ApiSuccess<T> = {
  success: true
  data: T
  error: null
}

export type ApiFailure = {
  success: false
  data: null
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export function success<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
    error: null
  }
}

export function failure(
  code: string,
  message: string,
  details?: unknown
): ApiFailure {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details
    }
  }
}
