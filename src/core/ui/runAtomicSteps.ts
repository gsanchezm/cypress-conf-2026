export interface AtomicScenarioSteps {
  arrangeViaApi: () => void;
  hydrateUi: () => void;
  assertUi: () => void;
}

// Extracted from AtomicScenario.run() so the arrange-then-hydrate-then-assert
// order is testable without cy.log() - this function is the actual unit
// under test in runAtomicSteps.node.test.ts.
export function runAtomicSteps(steps: AtomicScenarioSteps): void {
  steps.arrangeViaApi();
  steps.hydrateUi();
  steps.assertUi();
}
