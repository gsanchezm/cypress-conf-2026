import { logStep } from './stepLog';

// cypress/reports/ is git-ignored and already holds mochawesome's output.
export const DEMO_TRAIL_PATH = 'cypress/reports/demo-trail.log';

// The healing and mutation demos have to be verifiable from a headless
// `cypress run`, and cy.log never reaches the terminal there - it lives in
// the command log, Test Replay and `cypress open` (which is where the demo
// is shown on stage). So every demo event is narrated twice: logStep for
// the runner, and one appended line here for whoever reads the run
// afterwards. A cy.task would have done the same job through the terminal,
// but needs cypress.config.ts, which this sub-project leaves untouched.
//
// Lines carry the timestamp and test title because the file accumulates
// across runs (nothing truncates cypress/reports/ between them).
export function narrate(line: string): void {
  logStep(line);
  const stamped = `${new Date().toISOString()} ${Cypress.currentTest.title} :: ${line}\n`;
  cy.writeFile(DEMO_TRAIL_PATH, stamped, { flag: 'a+', log: false });
}
