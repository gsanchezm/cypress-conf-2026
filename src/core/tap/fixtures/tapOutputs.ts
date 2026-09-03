import type { RawProcessOutput } from '../parseTapOutput';

// Recorded verbatim on 2026-09-02 (Windows 11, Node v24.16.0, cypress 15.21.0,
// no `cypress open` session running) via
//   spawnSync(process.execPath, [require.resolve('cypress/bin'), 'tap', '<cmd>', '--json'],
//             { encoding: 'utf8', windowsHide: true })
// - the exact spawn scripts/tap.ts performs. Every call printed its payload
// and then aborted in libuv teardown (nodejs/node#64322) with status
// 3221226505 (0xC0000409; -1073740791 when printed signed) and the assertion
// line below on stderr.
export const LIBUV_STDERR = 'Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\\win\\async.c, line 94\r\n';

export const STATUS_NOT_CONNECTED_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: '{\n  "status": "not connected"\n}\n',
  stderr: LIBUV_STDERR,
};

export const SESSIONS_NONE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout:
    'No running Cypress session found. Start Cypress in open mode (e.g. `cypress open`) and select a testing type to get started.\n',
  stderr: LIBUV_STDERR,
};

export const SPECS_NO_SESSION_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: '',
  stderr:
    'Could not find a Cypress session to tap into.\n\nStart Cypress with cypress open, select a testing type and launch a browser, then try again.\n' +
    LIBUV_STDERR,
};

// Shape from https://docs.cypress.io/app/tooling/cypress-tap (`cypress tap status --json`),
// with the stage set to a terminal verdict. Replaced by a live capture if the
// optional headed-session step of Task 1 succeeds.
export const STATUS_PASSED_CLEAN: RawProcessOutput = {
  status: 0,
  stdout:
    JSON.stringify(
      {
        status: 'passed',
        pid: 4242,
        projectRoot: '/projects/app',
        testingType: 'e2e',
        browserAttached: true,
        browserName: 'Chrome',
        totalSpecs: 3,
        spec: 'cypress/e2e/auth/auth.feature',
        startedAt: '2026-09-02T10:15:00.000Z',
        totalTests: 2,
        results: { passed: 2, failed: 0, pending: 0, skipped: 0 },
      },
      null,
      2,
    ) + '\n',
  stderr: '',
};

export const STATUS_BAD_JSON_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: '{\n  "status": "runn',
  stderr: LIBUV_STDERR,
};

// Docs: an ambiguous --selector exits 1 and lists candidates on stdout.
export const DOM_AMBIGUOUS_EXIT_1: RawProcessOutput = {
  status: 1,
  stdout: "selector 'li' matched 25 elements but must be unique\n  0 '.dropdown'\n  1 '.dropdown-menu > :nth-child(1)'\n",
  stderr: '',
};
