import type { RawProcessOutput } from '../parseTapOutput';

// Every constant below is a verbatim spawnSync capture unless its comment says
// otherwise. Recorded 2026-09-02 on Windows 11, Node v24.16.0, cypress 15.21.0,
// via the exact spawn scripts/tap.ts performs:
//   spawnSync(process.execPath, [require.resolve('cypress/bin'), 'tap', ...args, '--json'],
//             { encoding: 'utf8', windowsHide: true })
// Almost every call printed its payload and then aborted in libuv teardown
// (nodejs/node#64322) with status 3221226505 (0xC0000409; -1073740791 signed)
// and the assertion line below on stderr. The one exception seen: `specs`
// with a session attached exited 0 with an empty stderr (SPECS_LIVE_CLEAN).
//
// Live captures (plan Task 1 Step 10): one headed `cypress open --e2e
// --browser chrome` was started from this worktree, attached on the first
// `tap:status` poll (`spec not selected`, Chrome), and
// `pnpm tap:run cypress/e2e/auth/auth.feature` (under the cross-worktree lock)
// returned a fresh `passed` verdict for 2/2 tests in 6.4 s. Facts learned
// that the docs page does not spell out:
//   - reporter test ids for a Gherkin feature start at r3/r4 (the Feature is a
//     nested suite), so `--test-id r1` is a real error, not the first test;
//   - `specs --json` entries also carry lastModified / lastModifiedTimestamp;
//   - an ambiguous `dom --selector` in --json mode is a payload
//     ({ ambiguous: true, count, selectors[] }) rather than an exit 1;
//   - `pin --at after` fails for a cy.get (one snapshot, index 1): omit --at
//     to pin the command's final state, and `pin --clear` answers
//     { cleared: true|false }.
// The session was killed (taskkill //T on the recorded pid) after the captures.
export const LIBUV_STDERR = "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\\win\\async.c, line 94\r\n";

// ---- no `cypress open` session running -----------------------------------

export const STATUS_NOT_CONNECTED_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"status\": \"not connected\"\n}\n",
  stderr: LIBUV_STDERR,
};

// Prose on stdout, not JSON: the vendor's own no-session hint.
export const SESSIONS_NONE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "No running Cypress session found. Start Cypress in open mode (e.g. `cypress open`) and select a testing type to get started.\n",
  stderr: LIBUV_STDERR,
};

// Empty stdout; the real message is on stderr in front of the libuv line.
export const SPECS_NO_SESSION_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "",
  stderr: "Could not find a Cypress session to tap into.\n\nStart Cypress with cypress open, select a testing type and launch a browser, then try again.\n" + LIBUV_STDERR,
};

// ---- live session, after `pnpm tap:run cypress/e2e/auth/auth.feature` ------

// The only live call that exited 0 with a clean stderr.
export const SPECS_LIVE_CLEAN: RawProcessOutput = {
  status: 0,
  stdout: "[\n  {\n    \"relativePath\": \"cypress/e2e/checkout/checkout.feature\",\n    \"lastModified\": \"2 weeks ago\",\n    \"lastModifiedTimestamp\": \"2026-08-19 19:06:24 -0600\"\n  },\n  {\n    \"relativePath\": \"cypress/e2e/catalog/catalog.feature\",\n    \"lastModified\": \"2 weeks ago\",\n    \"lastModifiedTimestamp\": \"2026-08-19 15:12:12 -0600\"\n  },\n  {\n    \"relativePath\": \"cypress/e2e/auth/auth.feature\",\n    \"lastModified\": \"2 weeks ago\",\n    \"lastModifiedTimestamp\": \"2026-08-19 12:44:55 -0600\"\n  }\n]\n",
  stderr: '',
};

// `status --json` right after the fresh verdict (the docs shape, verbatim).
export const STATUS_PASSED_LIVE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"status\": \"passed\",\n  \"pid\": 38380,\n  \"projectRoot\": \"C:\\\\Users\\\\gilsa\\\\Documents\\\\Repos\\\\cypress-conf-2026\\\\.worktrees\\\\c-agentic-loop\",\n  \"testingType\": \"e2e\",\n  \"browserAttached\": true,\n  \"browserName\": \"Chrome\",\n  \"totalSpecs\": 3,\n  \"spec\": \"cypress/e2e/auth/auth.feature\",\n  \"startedAt\": \"2026-09-03T00:31:03.726Z\",\n  \"totalTests\": 2,\n  \"results\": {\n    \"passed\": 2,\n    \"failed\": 0,\n    \"pending\": 0,\n    \"skipped\": 0\n  }\n}\n",
  stderr: LIBUV_STDERR,
};

// `reporter --json`: the overview an agent reads to find test ids (r3, r4).
export const REPORTER_OVERVIEW_LIVE: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"spec\": \"cypress/e2e/auth/auth.feature\",\n  \"startedAt\": \"2026-09-03T00:31:03.726Z\",\n  \"stats\": {\n    \"passed\": 2,\n    \"failed\": 0,\n    \"pending\": 0,\n    \"skipped\": 0,\n    \"duration\": 3376\n  },\n  \"tests\": [],\n  \"suites\": [\n    {\n      \"title\": \"Authentication\",\n      \"tests\": [\n        {\n          \"id\": \"r3\",\n          \"title\": \"A standard customer logs in successfully\",\n          \"state\": \"passed\",\n          \"duration\": 1681\n        },\n        {\n          \"id\": \"r4\",\n          \"title\": \"A locked-out customer cannot log in\",\n          \"state\": \"passed\",\n          \"duration\": 1613\n        }\n      ]\n    }\n  ]\n}\n",
  stderr: LIBUV_STDERR,
};

// `reporter --test-id r3 --json`: hooks + command rows of one passing test,
// including the AtomicScenario trace (request -> visit -> assert).
export const REPORTER_TEST_R3_LIVE: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"test\": {\n    \"id\": \"r3\",\n    \"title\": \"A standard customer logs in successfully\",\n    \"fullTitle\": \"Authentication > A standard customer logs in successfully\",\n    \"state\": \"passed\"\n  },\n  \"hooks\": [\n    {\n      \"hookId\": \"h1\",\n      \"hookName\": \"before all\"\n    },\n    {\n      \"hookId\": \"h2\",\n      \"hookName\": \"before each\"\n    },\n    {\n      \"hookId\": \"r3\",\n      \"hookName\": \"test body\"\n    },\n    {\n      \"hookId\": \"h4\",\n      \"hookName\": \"after each\"\n    }\n  ],\n  \"sessions\": [],\n  \"agents\": [],\n  \"routes\": [],\n  \"commands\": [\n    {\n      \"id\": \"1\",\n      \"name\": \"Before\",\n      \"message\": \"\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"2\",\n      \"name\": \"Before\",\n      \"message\": \"\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"3\",\n      \"name\": \"Before\",\n      \"message\": \"\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"4\",\n      \"name\": \"Given \",\n      \"message\": \"**a standard customer**\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"5\",\n      \"name\": \"When \",\n      \"message\": \"**they log in**\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"6\",\n      \"name\": \"Then \",\n      \"message\": \"**they should land on the catalog page as an authenticated customer**\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\"\n    },\n    {\n      \"id\": \"7\",\n      \"name\": \"log\",\n      \"message\": \"[auth] atomic scenario\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"8\",\n      \"name\": \"request\",\n      \"message\": \"POST 200 https://omnipizza-backend.onrender.com/api/auth/login\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1,\n      \"network\": {\n        \"indicator\": \"successful\"\n      }\n    },\n    {\n      \"id\": \"9\",\n      \"name\": \"visit\",\n      \"message\": \"/\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"10\",\n      \"name\": \"window\",\n      \"message\": \"\",\n      \"state\": \"passed\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"11\",\n      \"name\": \"visit\",\n      \"message\": \"/catalog\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"12\",\n      \"name\": \"location\",\n      \"message\": \"pathname\",\n      \"state\": \"passed\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"13\",\n      \"name\": \"assert\",\n      \"message\": \"expected **/catalog** to equal **/catalog**\",\n      \"state\": \"passed\",\n      \"type\": \"child\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"14\",\n      \"name\": \"get\",\n      \"message\": \"[data-testid=\\\"logout-btn\\\"]\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    {\n      \"id\": \"15\",\n      \"name\": \"assert\",\n      \"message\": \"expected **<button.btn-ghost>** to be **visible**\",\n      \"state\": \"passed\",\n      \"type\": \"child\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    }\n  ]\n}\n",
  stderr: LIBUV_STDERR,
};

// `reporter --test-id r1 --json`: r1 does not exist for a .feature spec.
export const REPORTER_UNKNOWN_TEST_ID_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "",
  stderr: "No test in this spec matched that id.\n\nLooked for --test-id \"r1\".\n\nRun cypress tap reporter to list the tests in the spec.\n" + LIBUV_STDERR,
};

// `dom --selector div --json`: ambiguity is a JSON payload in --json mode.
export const DOM_AMBIGUOUS_JSON_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"ambiguous\": true,\n  \"selector\": \"div\",\n  \"count\": 26,\n  \"selectors\": [\n    {\n      \"index\": 0,\n      \"selector\": \"#root\"\n    },\n    {\n      \"index\": 1,\n      \"selector\": \".lux-bg\"\n    },\n    {\n      \"index\": 2,\n      \"selector\": \"[data-testid=\\\"screen-login\\\"]\"\n    },\n    {\n      \"index\": 3,\n      \"selector\": \".hidden\"\n    },\n    {\n      \"index\": 4,\n      \"selector\": \".hidden > .inset-0\"\n    },\n    {\n      \"index\": 5,\n      \"selector\": \".bottom-20\"\n    },\n    {\n      \"index\": 6,\n      \"selector\": \".inline-block\"\n    },\n    {\n      \"index\": 7,\n      \"selector\": \".flex-col\"\n    },\n    {\n      \"index\": 8,\n      \"selector\": \".flex-col > .max-w-md\"\n    },\n    {\n      \"index\": 9,\n      \"selector\": \".lg\\\\:text-left\"\n    }\n  ]\n}\n",
  stderr: LIBUV_STDERR,
};

// `pin --test-id r3 --command-id 14 --at after --json`: cy.get has one snapshot.
export const PIN_UNKNOWN_SNAPSHOT_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "",
  stderr: "No snapshot of this command matched that name or index.\n\nLooked for --at \"after\". This command has these snapshots: [1]\n\n--at takes a snapshot name or a 1-based index; omit it to pin the command’s final state.\n" + LIBUV_STDERR,
};

// `pin --test-id r3 --command-id 14 --json` (final state): time-travel to /catalog.
export const PIN_LIVE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"pinned\": {\n    \"test\": \"r3\",\n    \"at\": {\n      \"index\": 1,\n      \"total\": 1\n    },\n    \"command\": {\n      \"id\": \"14\",\n      \"name\": \"get\",\n      \"message\": \"[data-testid=\\\"logout-btn\\\"]\",\n      \"state\": \"passed\",\n      \"type\": \"parent\",\n      \"hookId\": \"r3\",\n      \"group\": \"6\",\n      \"groupLevel\": 1\n    },\n    \"hookName\": \"test body\"\n  },\n  \"url\": \"https://omnipizza-frontend.onrender.com/catalog\"\n}\n",
  stderr: LIBUV_STDERR,
};

// `dom --selector [data-testid="logout-btn"] --json` while pinned: found.
export const DOM_PINNED_LIVE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"found\": true,\n  \"html\": \"<button data-testid=\\\"logout-btn\\\" class=\\\"btn-ghost\\\" type=\\\"button\\\" data-cypress-el=\\\"true\\\">Logout</button>\"\n}\n",
  stderr: LIBUV_STDERR,
};

// `pin --clear --json` with an active pin.
export const PIN_CLEAR_LIVE_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: "{\n  \"cleared\": true\n}\n",
  stderr: LIBUV_STDERR,
};

// ---- synthetic (no live capture exists for these shapes) --------------------

// Truncated JSON with the crash code: must be an error, never a silent success.
export const STATUS_BAD_JSON_CRASH: RawProcessOutput = {
  status: 3221226505,
  stdout: '{\n  "status": "runn',
  stderr: LIBUV_STDERR,
};

// A genuine exit 1 with the diagnostic on stdout, modelled on the docs' text
// output. Every live call on this machine exited 0 or with the libuv code, so
// this is the parser's "real non-zero exit" case rather than a capture.
export const DOM_AMBIGUOUS_EXIT_1: RawProcessOutput = {
  status: 1,
  stdout: "selector 'li' matched 25 elements but must be unique\n  0 '.dropdown'\n  1 '.dropdown-menu > :nth-child(1)'\n",
  stderr: '',
};
