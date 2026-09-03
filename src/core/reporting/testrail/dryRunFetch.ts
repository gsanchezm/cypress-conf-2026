import type { FetchLike } from './TestRailClient';
import type { RunLogger } from './testrailLogger';

interface PostedResults {
  results?: unknown[];
}

function describeBody(body: BodyInit | null | undefined): unknown {
  if (body instanceof FormData) {
    const file = body.get('attachment');
    return file instanceof File ? { attachment: file.name, bytes: file.size } : { attachment: null };
  }
  return typeof body === 'string' ? JSON.parse(body) : body;
}

// Enough of TestRail's answers for the observer's sequence to complete: add_run needs an id, and
// add_results_for_cases needs one created result per posted result (attachments key off them).
function cannedResponse(method: string, body: unknown): unknown {
  if (method.startsWith('add_run/')) return { id: 0 };
  if (method.startsWith('add_results_for_cases/')) {
    const results = (body as PostedResults).results ?? [];
    return results.map((_, index) => ({ id: index + 1, test_id: index + 1 }));
  }
  if (method.startsWith('add_attachment_to_result/')) return { attachment_id: 0 };
  return {};
}

// TESTRAIL_DRY_RUN=1: the exact production code path, with the network call replaced by a log line.
export function createDryRunFetch(logger: RunLogger): FetchLike {
  return async (url, init) => {
    const method = url.split('/api/v2/')[1] ?? url;
    const body = describeBody(init.body);
    logger.info({ method, body }, `TestRail dry-run: POST ${method}`);
    return new Response(JSON.stringify(cannedResponse(method, body)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}
