import { LocatorProxy } from '../../src/core/locators/LocatorProxy';

describe('LocatorProxy', () => {
  const proxy = new LocatorProxy({
    login: { usernameInput: '[data-testid="login-username"]' },
  });

  it('resolves a nested dot-path key to its selector string', () => {
    expect(proxy.get('login.usernameInput')).to.equal('[data-testid="login-username"]');
  });

  it('throws a clear error for a key that has no registered selector', () => {
    expect(() => proxy.get('login.missingKey')).to.throw(
      'LocatorProxy: no selector registered for key "login.missingKey"',
    );
  });

  it('caches a resolved key so repeated lookups do not re-walk the tree', () => {
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

    expect(readCount).to.equal(readsAfterFirstCall);
  });
});
