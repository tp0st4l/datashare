import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let router: Router;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        });
        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => httpMock.verify());

    it('ajoute le header Authorization quand un token existe', () => {
        localStorage.setItem('authToken', 'abc');
        http.get('/api/test').subscribe();

        const req = httpMock.expectOne('/api/test');
        expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
        req.flush({});
    });

    it("n'ajoute pas de header sans token", () => {
        http.get('/api/test').subscribe();

        const req = httpMock.expectOne('/api/test');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
    });

    it('sur un 401 : déconnecte et redirige vers /login', () => {
        localStorage.setItem('authToken', 'abc');
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        http.get('/api/auth/me').subscribe({ error: () => { } });
        httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(localStorage.getItem('authToken')).toBeNull();
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('sur un 401 du login : ne redirige pas', () => {
        const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        http.post('/api/auth/login', {}).subscribe({ error: () => { } });
        httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(navigateSpy).not.toHaveBeenCalled();
    });
});