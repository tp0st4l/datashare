describe('Connexion', () => {
    const password = 'Motdepasse123';
    let email: string;

    beforeEach(() => {
        // Un compte neuf par test, créé directement par l'API (plus rapide que le formulaire)
        email = `login-${Date.now()}@datashare.test`;
        cy.request('POST', '/api/auth/register', { email, password });
    });

    it('refuse un email au mauvais format sans appeler le serveur', () => {
        cy.visit('/login');
        cy.get('#email').type('pas-un-email');
        cy.get('#password').type(password);
        cy.contains('button', 'Connexion').click();

        cy.contains("Le format de l'email est invalide.").should('be.visible');
        cy.location('pathname').should('eq', '/login');
    });

    it('affiche une erreur avec un mauvais mot de passe', () => {
        cy.visit('/login');
        cy.get('#email').type(email);
        cy.get('#password').type('MauvaisMotDePasse');
        cy.contains('button', 'Connexion').click();

        cy.get('.alert-error').should('be.visible');
        cy.location('pathname').should('eq', '/login');
    });

    it('connecte un utilisateur avec les bons identifiants', () => {
        cy.visit('/login');
        cy.get('#email').type(email);
        cy.get('#password').type(password);
        cy.contains('button', 'Connexion').click();

        cy.location('pathname').should('not.eq', '/login');
        cy.contains('Mon espace').should('be.visible');
    });
});