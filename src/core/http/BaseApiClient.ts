import { parseApiResponse } from './parseApiResponse';

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Cypress.RequestBody;
  headers?: Record<string, string>;
}

export abstract class BaseApiClient {
  protected abstract readonly basePath: string;

  // Returns the raw response (never throws on 4xx/5xx) - for the rare case
  // where a test needs to assert on an expected failure response itself
  // (e.g. asserting a 404 body), rather than treating failure as exceptional.
  protected requestRaw(options: ApiRequestOptions): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: options.method,
      url: `${Cypress.env('apiUrl')}${this.basePath}${options.path}`,
      body: options.body,
      headers: options.headers,
      failOnStatusCode: false,
      // Render free-tier services can cold-start; give the first request
      // room - 60s covers Render's documented worst-case cold-start latency
      // (30s wasn't enough, confirmed live: first request of a run timed out
      // at 30s, the next one succeeded immediately once the instance was
      // warm). retryOnNetworkFailure defaults to true in Cypress already -
      // stated explicitly here so the cold-start handling this spec
      // promises is visible in the code, not an unstated default.
      timeout: 60000,
      retryOnNetworkFailure: true,
    });
  }

  // Returns the parsed body, or throws ApiError on 4xx/5xx - the default for
  // "arrange" calls that expect success. The throw-or-return decision lives
  // in parseApiResponse(), not here, so it's testable without cy.request().
  protected request<T>(options: ApiRequestOptions): Cypress.Chainable<T> {
    return this.requestRaw(options).then((response) =>
      // The cast below bridges a known TS/Cypress generic-inference limit:
      // ThenReturn<Response<unknown>, T> can't be proven to equal
      // Chainable<T> for an unconstrained T, even though the runtime value
      // is already correctly T-shaped from parseApiResponse's own `as T` cast.
      parseApiResponse<T>(response, `${options.method} ${this.basePath}${options.path}`),
    ) as Cypress.Chainable<T>;
  }
}
