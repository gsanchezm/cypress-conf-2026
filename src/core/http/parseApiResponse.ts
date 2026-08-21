import { ApiError } from './ApiError';

export interface RawApiResponse {
  status: number;
  body: unknown;
}

// Extracted from BaseApiClient.request() so the throw-on-4xx/5xx contract
// is testable without cy.request() - this function is the actual unit
// under test in parseApiResponse.node.test.ts.
export function parseApiResponse<T>(response: RawApiResponse, description: string): T {
  if (response.status >= 400) {
    throw new ApiError(response.status, response.body, `${description} failed with ${response.status}`);
  }
  return response.body as T;
}
