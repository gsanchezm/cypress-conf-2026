import { AtomicScenario } from '../../src/core/ui/AtomicScenario';

describe('AtomicScenario', () => {
  it('runs arrangeViaApi, then hydrateUi, then assertUi, in that order', () => {
    const callOrder: string[] = [];

    AtomicScenario.for('test-slice').run({
      arrangeViaApi: () => callOrder.push('arrangeViaApi'),
      hydrateUi: () => callOrder.push('hydrateUi'),
      assertUi: () => callOrder.push('assertUi'),
    });

    expect(callOrder).to.deep.equal(['arrangeViaApi', 'hydrateUi', 'assertUi']);
  });

  it('calls each step exactly once', () => {
    const arrangeViaApi = cy.stub();
    const hydrateUi = cy.stub();
    const assertUi = cy.stub();

    AtomicScenario.for('test-slice').run({ arrangeViaApi, hydrateUi, assertUi });

    expect(arrangeViaApi).to.be.calledOnce;
    expect(hydrateUi).to.be.calledOnce;
    expect(assertUi).to.be.calledOnce;
  });
});
