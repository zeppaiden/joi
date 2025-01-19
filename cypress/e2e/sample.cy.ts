describe('Sample Test', () => {
  it('Visits the Home Page', () => {
    cy.visit('/');
    cy.contains('Welcome');
  });
}); 