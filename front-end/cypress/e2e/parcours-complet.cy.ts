describe('Parcours complet contre le vrai back-end', () => {
    const email = `parcours-${Date.now()}@datashare.test`;
    const password = 'Motdepasse123';
    const filePassword = 'secret123';
    const fileName = 'parcours-e2e.txt';
    const fileContent = 'Bonjour DataShare !';

    it('inscription → connexion → upload protégé → téléchargement', () => {
        // 1. Inscription
        cy.visit('/register');
        cy.get('#email').type(email);
        cy.get('#password').type(password);
        cy.get('#confirmPassword').type(password);
        cy.contains('button', 'Créer mon compte').click();

        cy.location('pathname').should('eq', '/login');
        cy.contains('Votre compte a été créé').should('be.visible');

        // 2. Connexion
        cy.get('#email').type(email);
        cy.get('#password').type(password);
        cy.contains('button', 'Connexion').click();
        cy.contains('Mon espace').should('be.visible');

        // 3. Upload d'un fichier protégé par mot de passe
        cy.visit('/');
        cy.get('#file').selectFile(
            { contents: Cypress.Buffer.from(fileContent), fileName, mimeType: 'text/plain' },
            { force: true },
        );
        cy.contains(fileName).should('be.visible');
        cy.get('#password').type(filePassword);
        cy.contains('button', 'Téléverser').click();

        cy.contains('Félicitations').should('be.visible');

        // 4. Ouverture du lien de partage
        cy.get('.share-link').invoke('attr', 'href').then((link) => {
            cy.visit(link as string);
        });
        cy.contains(fileName).should('be.visible');

        // 5. Mauvais mot de passe : refusé
        cy.get('#password').type('mauvais');
        cy.contains('button', 'Télécharger').click();
        cy.get('.alert-error').should('be.visible');

        // 6. Bon mot de passe : le fichier est téléchargé avec le bon contenu
        cy.get('#password').clear().type(filePassword);
        cy.contains('button', 'Télécharger').click();
        cy.readFile(`${Cypress.config('downloadsFolder')}/${fileName}`).should('eq', fileContent);
    });
});