import { test } from 'node:test';
import assert from 'node:assert/strict';
import onFix from 'cypress-on-fix';

type Handler = (...args: unknown[]) => unknown;

// The shape Cypress's plugin registry has from a config file's point of view: one slot per event
// name, last registration wins (cypress-io/cypress#22428). Only the IPC is missing.
function oneSlotRegistry() {
  const slots = new Map<string, Handler>();
  const on = ((event: string, handler: Handler) => {
    slots.set(event, handler);
  }) as unknown as Cypress.PluginEvents;
  const fire = (event: string) => slots.get(event)?.();
  return { on, fire };
}

test('a bare Cypress-style registry keeps only the last after:spec handler', async () => {
  const { on, fire } = oneSlotRegistry();
  const calls: string[] = [];
  on('after:spec', () => {
    calls.push('cucumber preprocessor');
  });
  on('after:spec', () => {
    calls.push('reporting subject');
  });

  await fire('after:spec');

  assert.deepEqual(calls, ['reporting subject']);
});

test('cypress-on-fix fans the single slot out to every handler, in registration order', async () => {
  const { on: cypressOn, fire } = oneSlotRegistry();
  const on = onFix(cypressOn);
  const calls: string[] = [];
  on('after:spec', () => {
    calls.push('cucumber preprocessor');
  });
  on('after:spec', () => {
    calls.push('reporting subject');
  });

  await fire('after:spec');

  assert.deepEqual(calls, ['cucumber preprocessor', 'reporting subject']);
});
