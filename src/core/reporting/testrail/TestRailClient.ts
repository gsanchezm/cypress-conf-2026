import type { TestRailConfig } from './TestRailConfig';
import type { TestRailRequest } from './requests';

// Node 24's global fetch, narrowed so tests (and the dry run) can substitute a fake.
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface TestRailClientDeps {
  fetch: FetchLike;
  sleep: (ms: number) => Promise<void>;
}

// TestRail Cloud rate-limits (180 req/min Professional) and answers 429 + Retry-After (seconds).
const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 2000;

export class TestRailApiError extends Error {
  constructor(
    readonly method: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`TestRail ${method} responded ${status}: ${body}`);
    this.name = 'TestRailApiError';
  }
}

export function apiUrl(baseUrl: string, method: string): string {
  return `${baseUrl}/index.php?/api/v2/${method}`;
}

export function basicAuthHeader(user: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${user}:${apiKey}`).toString('base64')}`;
}

export function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RETRY_AFTER_MS;
}

export class TestRailClient {
  constructor(
    private readonly config: Pick<TestRailConfig, 'url' | 'user' | 'apiKey'>,
    private readonly deps: TestRailClientDeps,
  ) {}

  postJson<T>(request: TestRailRequest): Promise<T> {
    return this.send<T>(request.method, { 'Content-Type': 'application/json' }, JSON.stringify(request.body));
  }

  // No Content-Type on purpose: fetch derives the multipart boundary from the FormData itself.
  postForm<T>(method: string, form: FormData): Promise<T> {
    return this.send<T>(method, {}, form);
  }

  private async send<T>(method: string, headers: Record<string, string>, body: BodyInit, attempt = 0): Promise<T> {
    const response = await this.deps.fetch(apiUrl(this.config.url, method), {
      method: 'POST',
      headers: { ...headers, Authorization: basicAuthHeader(this.config.user, this.config.apiKey) },
      body,
    });
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await this.deps.sleep(retryAfterMs(response));
      return this.send<T>(method, headers, body, attempt + 1);
    }
    if (!response.ok) throw new TestRailApiError(method, response.status, await response.text());
    return (await response.json()) as T;
  }
}
