import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDryRunFetch } from './dryRunFetch';
import type { RunLogger } from './testrailLogger';

function recordingLogger() {
  const entries: Array<{ context: object; message: string }> = [];
  const logger: RunLogger = {
    info: (context, message) => { entries.push({ context, message }); },
    error: (context, message) => { entries.push({ context, message }); },
  };
  return { entries, logger };
}

test('the dry-run fetch logs the method and parsed body instead of sending it', async () => {
  const { entries, logger } = recordingLogger();
  const fetchImpl = createDryRunFetch(logger);

  await fetchImpl('https://example.testrail.io/index.php?/api/v2/add_run/7', { method: 'POST', body: JSON.stringify({ include_all: false }) });

  assert.deepEqual(entries[0], { context: { method: 'add_run/7', body: { include_all: false } }, message: 'TestRail dry-run: POST add_run/7' });
});

test('the dry-run fetch answers add_results_for_cases with one canned result per posted result', async () => {
  const { logger } = recordingLogger();
  const fetchImpl = createDryRunFetch(logger);

  const response = await fetchImpl('https://example.testrail.io/index.php?/api/v2/add_results_for_cases/0', {
    method: 'POST',
    body: JSON.stringify({ results: [{ case_id: 1001 }, { case_id: 1002 }] }),
  });

  assert.deepEqual(await response.json(), [{ id: 1, test_id: 1 }, { id: 2, test_id: 2 }]);
});

test('the dry-run fetch describes a multipart attachment by name and size', async () => {
  const { entries, logger } = recordingLogger();
  const fetchImpl = createDryRunFetch(logger);
  const form = new FormData();
  form.append('attachment', new Blob([new Uint8Array([1, 2, 3])]), 'shot.png');

  await fetchImpl('https://example.testrail.io/index.php?/api/v2/add_attachment_to_result/1', { method: 'POST', body: form });

  assert.deepEqual(entries[0].context, { method: 'add_attachment_to_result/1', body: { attachment: 'shot.png', bytes: 3 } });
});
