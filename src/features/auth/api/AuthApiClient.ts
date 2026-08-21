import { BaseApiClient } from '@/core/http/BaseApiClient';
import type { AuthSession } from '@/core/types';

interface LoginResponseBody {
  access_token: string;
  token_type: string;
  username: string;
  behavior: string;
}

function toAuthSession(body: LoginResponseBody): AuthSession {
  return {
    accessToken: body.access_token,
    tokenType: 'bearer',
    username: body.username,
    behavior: body.behavior,
  };
}

export class AuthApiClient extends BaseApiClient {
  protected readonly basePath = '/api/auth';

  // Expects success - throws ApiError on 4xx/5xx (e.g. wrong password).
  login(username: string, password: string): Cypress.Chainable<AuthSession> {
    return this.request<LoginResponseBody>({
      method: 'POST',
      path: '/login',
      body: { username, password },
    }).then(toAuthSession);
  }

  // For scenarios where a non-2xx response IS the expected outcome
  // (e.g. locked_out_user) - never throws, callers assert on .status themselves.
  attemptLogin(username: string, password: string): Cypress.Chainable<Cypress.Response<unknown>> {
    return this.requestRaw({
      method: 'POST',
      path: '/login',
      body: { username, password },
    });
  }
}
