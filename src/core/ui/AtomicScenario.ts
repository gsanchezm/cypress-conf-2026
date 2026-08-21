import { runAtomicSteps } from './runAtomicSteps';
import type { AtomicScenarioSteps } from './runAtomicSteps';

export type { AtomicScenarioSteps };

export class AtomicScenario {
  private constructor(private readonly slice: string) {}

  static for(slice: string): AtomicScenario {
    return new AtomicScenario(slice);
  }

  run(steps: AtomicScenarioSteps): void {
    cy.log(`[${this.slice}] atomic scenario`);
    runAtomicSteps(steps);
  }
}
