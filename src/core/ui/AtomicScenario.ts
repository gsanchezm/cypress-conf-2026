import { runAtomicSteps } from './runAtomicSteps';
import { logStep, logDetail } from '@/core/logging/stepLog';
import type { AtomicScenarioSteps } from './runAtomicSteps';

export type { AtomicScenarioSteps };

export class AtomicScenario {
  private constructor(private readonly slice: string) {}

  static for(slice: string): AtomicScenario {
    return new AtomicScenario(slice);
  }

  // The per-phase lines are debug-level: on a passing run they are noise,
  // but when a scenario fails they say which of the three phases it died
  // in without reading the stack. The wrapping happens here rather than
  // inside runAtomicSteps so that function stays free of Cypress and
  // testable under node:test.
  run(steps: AtomicScenarioSteps): void {
    logStep(`[${this.slice}] atomic scenario`);
    runAtomicSteps({
      arrangeViaApi: () => {
        logDetail(`[${this.slice}] arrangeViaApi`);
        steps.arrangeViaApi();
      },
      hydrateUi: () => {
        logDetail(`[${this.slice}] hydrateUi`);
        steps.hydrateUi();
      },
      assertUi: () => {
        logDetail(`[${this.slice}] assertUi`);
        steps.assertUi();
      },
    });
  }
}
