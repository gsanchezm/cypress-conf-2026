import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTapOutput, stripLibuvNoise, isLibuvTeardownCrash, LIBUV_CLOSING_ASSERTION } from './parseTapOutput';
import {
  STATUS_NOT_CONNECTED_CRASH,
  SESSIONS_NONE_CRASH,
  SPECS_NO_SESSION_CRASH,
  SPECS_LIVE_CLEAN,
  STATUS_BAD_JSON_CRASH,
  DOM_AMBIGUOUS_EXIT_1,
} from './fixtures/tapOutputs';

// The one live call that did NOT abort in libuv teardown on this machine:
// `specs --json` with a session attached exited 0 with an empty stderr.
test('a clean exit with JSON on stdout is ok and not flagged as a crash', () => {
  assert.deepEqual(parseTapOutput(SPECS_LIVE_CLEAN), {
    kind: 'ok',
    data: JSON.parse(SPECS_LIVE_CLEAN.stdout),
    crashedOnExit: false,
  });
});

// The whole reason this module exists: on Windows + Node 24 every cypress tap
// call prints its result and then aborts in libuv teardown. The JSON is intact.
test('the Windows libuv teardown abort after valid JSON is treated as success', () => {
  assert.deepEqual(parseTapOutput(STATUS_NOT_CONNECTED_CRASH), {
    kind: 'ok',
    data: { status: 'not connected' },
    crashedOnExit: true,
  });
});

test('the crash is recognised from the stderr assertion even when the shell re-maps the exit code', () => {
  const remapped = { ...STATUS_NOT_CONNECTED_CRASH, status: 127 };
  assert.equal(parseTapOutput(remapped).kind, 'ok');
});

test('the crash is recognised from the signed exit code even with an empty stderr', () => {
  assert.equal(isLibuvTeardownCrash({ status: -1073740791, stdout: '{}', stderr: '' }), true);
});

test('a crash with unparseable stdout is an error, not a silent success', () => {
  const outcome = parseTapOutput(STATUS_BAD_JSON_CRASH);
  assert.match(outcome.kind === 'error' ? outcome.message : 'ok', /non-JSON output/);
});

// `sessions --json` with no session prints prose on stdout and exits 0 - the
// agent must see that prose, not a JSON parse stack trace.
test('non-JSON prose on stdout surfaces as the error message', () => {
  const outcome = parseTapOutput(SESSIONS_NONE_CRASH);
  assert.match(outcome.kind === 'error' ? outcome.message : 'ok', /No running Cypress session found/);
});

test('an empty stdout reports the cleaned stderr as the error, without the libuv line', () => {
  const outcome = parseTapOutput(SPECS_NO_SESSION_CRASH);
  assert.equal(
    outcome.kind === 'error' ? outcome.message : 'ok',
    'Could not find a Cypress session to tap into.\n\nStart Cypress with cypress open, select a testing type and launch a browser, then try again.',
  );
});

test('a genuine non-zero exit is an error that keeps stdout for the caller', () => {
  const outcome = parseTapOutput(DOM_AMBIGUOUS_EXIT_1);
  assert.equal(outcome.kind === 'error' ? outcome.stdout : '', DOM_AMBIGUOUS_EXIT_1.stdout.trim());
});

test('stripLibuvNoise removes only the assertion line', () => {
  assert.equal(stripLibuvNoise(`real problem\r\n${LIBUV_CLOSING_ASSERTION}, file src\\win\\async.c, line 94\r\n`), 'real problem');
});
