import { BaseApiClient } from '../../src/core/http/BaseApiClient';
import { ApiError } from '../../src/core/http/ApiError';

class TestApiClient extends BaseApiClient {
  protected readonly basePath = '';

  fetchHealth(): Cypress.Chainable<{ status: string }> {
    return this.request<{ status: string }>({ method: 'GET', path: '/health' });
  }

  fetchNonexistentRoute(): Cypress.Chainable<unknown> {
    return this.request({ method: 'GET', path: '/api/definitely-not-a-real-route' });
  }
}

describe('BaseApiClient', () => {
  it('builds the URL from apiUrl + basePath + path and returns the parsed body on success', () => {
    const client = new TestApiClient();
    client.fetchHealth().then((body) => {
      expect(body.status).to.equal('healthy');
    });
  });

  it('throws ApiError with the response status and body on a 4xx/5xx response', (done) => {
    cy.on('fail', (err) => {
      expect(err).to.be.instanceOf(ApiError);
      expect((err as ApiError).status).to.equal(404);
      expect((err as ApiError).body).to.deep.equal({ detail: 'Not Found' });
      done();
      return false;
    });

    const client = new TestApiClient();
    client.fetchNonexistentRoute();
  });
});
