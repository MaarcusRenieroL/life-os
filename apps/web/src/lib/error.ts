/** Every API error response body looks like `{ message: string }` (see `ApiResponse.error` on the
 * backend) - this pulls that message out of an axios error, falling back to a caller-supplied
 * default when the error isn't shaped like one of ours (a network failure, a non-API exception). */
export function getErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}
