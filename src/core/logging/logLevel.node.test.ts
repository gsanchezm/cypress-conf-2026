import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldLog, resolveLogLevel, DEFAULT_LOG_LEVEL } from './logLevel';

test('defaults to info when no level is configured', () => {
  assert.equal(resolveLogLevel(undefined), DEFAULT_LOG_LEVEL);
  assert.equal(DEFAULT_LOG_LEVEL, 'info');
});

test('accepts a configured level regardless of casing or padding', () => {
  assert.equal(resolveLogLevel('DEBUG'), 'debug');
  assert.equal(resolveLogLevel('  silent '), 'silent');
});

// A typo'd level silently falling back to the default is exactly the kind of
// quiet wrong behaviour this framework keeps removing: the run would look
// configured and log at some other level entirely.
test('throws on an unrecognised level instead of falling back to the default', () => {
  assert.throws(() => resolveLogLevel('debgu'), /unknown log level "debgu".*silent, info, debug/s);
});

test('info level emits info messages but not debug ones', () => {
  assert.equal(shouldLog('info', 'info'), true);
  assert.equal(shouldLog('info', 'debug'), false);
});

test('debug level emits both', () => {
  assert.equal(shouldLog('debug', 'info'), true);
  assert.equal(shouldLog('debug', 'debug'), true);
});

test('silent level emits nothing', () => {
  assert.equal(shouldLog('silent', 'info'), false);
  assert.equal(shouldLog('silent', 'debug'), false);
});

test('an unconfigured level behaves as info', () => {
  assert.equal(shouldLog(undefined, 'info'), true);
  assert.equal(shouldLog(undefined, 'debug'), false);
});
