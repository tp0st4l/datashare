describe('Accueil', () => {
    it('affiche la page d\'accueil avec le bouton de connexion', () => {
        cy.visit('/');
        cy.contains('Se connecter').should('be.visible');
    });
});