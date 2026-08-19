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
    const first = proxy.get('login.usernameInput');
    const second = proxy.get('login.usernameInput');
    expect(first).to.equal(second);
  });
});
