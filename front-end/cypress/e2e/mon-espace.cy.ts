describe('Mon espace', () => {
    const password = 'Motdepasse123';
    let token: string;

    beforeEach(() => {
        // Un compte neuf par test, créé et connecté directement par l'API
        const email = `espace-${Date.now()}@datashare.test`;
        cy.request('POST', '/api/auth/register', { email, password });
        cy.request('POST', '/api/auth/login', { email, password }).then((response) => {
            token = response.body.accessToken;
        });
    });

    // Ouvre une page en étant déjà connecté : le token est placé avant le démarrage de l'appli
    const visitAsLoggedIn = (path: string) =>
        cy.visit(path, { onBeforeLoad: (win) => win.localStorage.setItem('authToken', token) });

    // Dépose un fichier par l'API, depuis le navigateur (cy.request ne sait pas envoyer de formulaire multipart)
    const uploadFile = (name: string) =>
        cy.window().then((win) => {
            const form = new win.FormData();
            form.append('file', new win.Blob([`Contenu de ${name}`], { type: 'text/plain' }), name);
            return win
                .fetch('/api/files', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
                .then((response) => expect(response.status).to.eq(201));
        });

    it('liste les fichiers, annule puis confirme une suppression', () => {
        visitAsLoggedIn('/');
        uploadFile('rapport.txt');
        uploadFile('photos.txt');

        visitAsLoggedIn('/my-files');
        cy.contains('rapport.txt').should('be.visible');
        cy.contains('photos.txt').should('be.visible');

        // Annulation : le fichier reste
        cy.get('[aria-label="Supprimer rapport.txt"]').click();
        cy.contains('Supprimer définitivement ?').should('be.visible');
        cy.contains('button', 'Annuler').click();
        cy.contains('rapport.txt').should('be.visible');

        // Confirmation : le fichier disparaît, l'autre reste
        cy.get('[aria-label="Supprimer rapport.txt"]').click();
        cy.contains('button', 'Confirmer').click();
        cy.contains('rapport.txt').should('not.exist');
        cy.contains('photos.txt').should('be.visible');

        // La suppression a bien eu lieu côté serveur : elle résiste au rechargement de la page
        cy.reload();
        cy.contains('photos.txt').should('be.visible');
        cy.contains('rapport.txt').should('not.exist');
    });

    it('renvoie vers la connexion sans être connecté', () => {
        cy.visit('/my-files');
        cy.location('pathname').should('eq', '/login');
    });
});