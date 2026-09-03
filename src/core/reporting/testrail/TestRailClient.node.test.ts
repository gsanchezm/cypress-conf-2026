import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TestRailApiError, TestRailClient, type FetchLike } from './TestRailClient';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function recordingFetch(responses: Response[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return responses.shift() ?? jsonResponse({});
  };
  return { calls, fetchImpl };
}

const config = { url: 'https://acme.testrail.io', user: 'qa@acme.example', apiKey: 'k3y' };
const request = { method: 'add_run/7', body: { include_all: false } };

test('postJson targets index.php?/api/v2/<method> with Basic auth from user:apiKey', async () => {
  const { calls, fetchImpl } = recordingFetch([jsonResponse({ id: 42 })]);
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} });

  await client.postJson(request);

  const headers = calls[0].init.headers as Record<string, string>;
  assert.deepEqual([calls[0].url, headers.Authorization], [
    'https://acme.testrail.io/index.php?/api/v2/add_run/7',
    `Basic ${Buffer.from('qa@acme.example:k3y').toString('base64')}`,
  ]);
});

test('postJson returns the parsed JSON body', async () => {
  const { fetchImpl } = recordingFetch([jsonResponse({ id: 42 })]);
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} });
  assert.deepEqual(await client.postJson(request), { id: 42 });
});

test('a 429 is retried after sleeping for Retry-After seconds', async () => {
  const slept: number[] = [];
  const { calls, fetchImpl } = recordingFetch([jsonResponse({ error: 'slow down' }, 429, { 'Retry-After': '7' }), jsonResponse({ id: 42 })]);
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async (ms) => { slept.push(ms); } });

  await client.postJson(request);

  // Two facts of one retry: it waited the advertised time, and it sent exactly one more request.
  assert.deepEqual([slept, calls.length], [[7000], 2]);
});

test('after three retries a persistent 429 surfaces as TestRailApiError', async () => {
  const { fetchImpl } = recordingFetch(Array.from({ length: 4 }, () => jsonResponse({ error: 'slow down' }, 429, { 'Retry-After': '1' })));
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} });
  await assert.rejects(client.postJson(request), (error: unknown) => error instanceof TestRailApiError && error.status === 429);
});

test('a non-2xx response throws with the method, status and body', async () => {
  const { fetchImpl } = recordingFetch([jsonResponse({ error: 'Field :case_ids is not a valid list' }, 400)]);
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} });
  await assert.rejects(client.postJson(request), /TestRail add_run\/7 responded 400: .*case_ids/);
});

test('postForm sends the FormData body without a manual Content-Type', async () => {
  const { calls, fetchImpl } = recordingFetch([jsonResponse({ attachment_id: 1 })]);
  const client = new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} });
  const form = new FormData();
  form.append('attachment', new Blob([new Uint8Array([1])]), 'shot.png');

  await client.postForm('add_attachment_to_result/5', form);

  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal('Content-Type' in headers, false);
});
