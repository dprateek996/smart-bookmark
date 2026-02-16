export function success(data: any) {
  return {
    status: 'success',
    data
  }
}

export function failure(message: string) {
  return {
    status: 'error',
    message
  }
}