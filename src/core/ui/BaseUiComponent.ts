export abstract class BaseUiComponent {
  protected abstract readonly route: string;
  protected abstract readonly readySelector: string;

  load(): void {
    cy.visit(this.route);
    cy.get(this.readySelector, { timeout: 15000 }).should('be.visible');
  }
}
