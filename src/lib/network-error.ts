'use client';

export function normalizeProviderNetworkError(error: unknown, provider: string): Error {
  if (error instanceof Error) {
    const isNetworkFailure =
      error instanceof TypeError &&
      /failed to fetch|network\s*error|network request failed|load failed/i.test(error.message);
    if (isNetworkFailure) {
      return new Error(
        `${provider} request failed to reach the API. Check your network or browser restrictions and try again.`
      );
    }
    return error;
  }
  return new Error(`${provider} request failed with an unknown error.`);
}
