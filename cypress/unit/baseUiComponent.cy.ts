import { BaseUiComponent } from '../../src/core/ui/BaseUiComponent';

class RootPageComponent extends BaseUiComponent {
  protected readonly route = '/';
  protected readonly readySelector = 'body';
}

describe('BaseUiComponent', () => {
  it('visits its route and waits for the ready selector to become visible', () => {
    new RootPageComponent().load();
    cy.get('body').should('be.visible');
  });
});
