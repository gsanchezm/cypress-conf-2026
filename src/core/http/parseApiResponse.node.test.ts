import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApiResponse } from './parseApiResponse';
import { ApiError } from './ApiError';

test('returns the parsed body on a successful response', () => {
  const body = parseApiResponse<{ status: string }>({ status: 200, body: { status: 'healthy' } }, 'GET /health');
  assert.deepEqual(body, { status: 'healthy' });
});

test('throws ApiError with the response status and body on a 4xx/5xx response', () => {
  assert.throws(
    () =>
      parseApiResponse(
        { status: 404, body: { detail: 'Not Found' } },
        'GET /api/definitely-not-a-real-route',
      ),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 404);
      assert.deepEqual(err.body, { detail: 'Not Found' });
      assert.match(err.message, /GET \/api\/definitely-not-a-real-route failed with 404/);
      return true;
    },
  );
});
