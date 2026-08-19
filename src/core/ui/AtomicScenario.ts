export interface AtomicScenarioSteps {
  arrangeViaApi: () => void;
  hydrateUi: () => void;
  assertUi: () => void;
}

export class AtomicScenario {
  private constructor(private readonly slice: string) {}

  static for(slice: string): AtomicScenario {
    return new AtomicScenario(slice);
  }

  run(steps: AtomicScenarioSteps): void {
    cy.log(`[${this.slice}] atomic scenario`);
    steps.arrangeViaApi();
    steps.hydrateUi();
    steps.assertUi();
  }
}
