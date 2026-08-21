import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocatorProxy } from './LocatorProxy';

test('resolves a nested dot-path key to its selector string', () => {
  const proxy = new LocatorProxy({ login: { usernameInput: '[data-testid="login-username"]' } });
  assert.equal(proxy.get('login.usernameInput'), '[data-testid="login-username"]');
});

test('throws a clear error for a key that has no registered selector', () => {
  const proxy = new LocatorProxy({ login: { usernameInput: '[data-testid="login-username"]' } });
  assert.throws(
    () => proxy.get('login.missingKey'),
    /LocatorProxy: no selector registered for key "login\.missingKey"/,
  );
});

test('caches a resolved key so repeated lookups do not re-walk the tree', () => {
  let readCount = 0;
  const trackedTree = new Proxy(
    { login: { usernameInput: '[data-testid="login-username"]' } },
    {
      get(target, prop, receiver) {
        readCount += 1;
        return Reflect.get(target, prop, receiver);
      },
    },
  );
  const trackedProxy = new LocatorProxy(trackedTree);

  trackedProxy.get('login.usernameInput');
  const readsAfterFirstCall = readCount;
  trackedProxy.get('login.usernameInput');

  assert.equal(readCount, readsAfterFirstCall);
});
