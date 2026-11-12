import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

function makeToken(exp: number): string {
    const payload = btoa(JSON.stringify({ exp })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `header.${payload}.signature`;
}

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('register envoie POST /api/auth/register avec email et mot de passe', () => {
        service.register({ email: 'test@datashare.fr', password: 'motdepasse' }).subscribe();

        const req = httpMock.expectOne('/api/auth/register');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ email: 'test@datashare.fr', password: 'motdepasse' });
        req.flush(null, { status: 201, statusText: 'Created' });
    });

    it('login enregistre le token reçu', () => {
        service.login({ email: 'test@datashare.fr', password: 'motdepasse' }).subscribe();

        httpMock.expectOne('/api/auth/login').flush({ accessToken: 'abc' });
        expect(service.getToken()).toBe('abc');
    });

    it('me envoie GET /api/auth/me', () => {
        service.me().subscribe((me) => expect(me.email).toBe('test@datashare.fr'));

        const req = httpMock.expectOne('/api/auth/me');
        expect(req.request.method).toBe('GET');
        req.flush({ email: 'test@datashare.fr' });
    });

    it('logout supprime le token', () => {
        localStorage.setItem('authToken', 'abc');
        service.logout();
        expect(service.getToken()).toBeNull();
    });

    it('isLoggedIn est faux sans token', () => {
        expect(service.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn est vrai avec un token non expiré', () => {
        localStorage.setItem('authToken', makeToken(Date.now() / 1000 + 3600));
        expect(service.isLoggedIn()).toBe(true);
    });

    it('isLoggedIn est faux avec un token expiré', () => {
        localStorage.setItem('authToken', makeToken(Date.now() / 1000 - 3600));
        expect(service.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn est faux avec un token illisible', () => {
        localStorage.setItem('authToken', 'nimportequoi');
        expect(service.isLoggedIn()).toBe(false);
    });

    it('loggedIn suit la connexion et la déconnexion', () => {
        service.login({ email: 'test@datashare.fr', password: 'motdepasse' }).subscribe();
        httpMock.expectOne('/api/auth/login').flush({ accessToken: 'abc' });
        expect(service.loggedIn()).toBe(true);

        service.logout();
        expect(service.loggedIn()).toBe(false);
    });
});