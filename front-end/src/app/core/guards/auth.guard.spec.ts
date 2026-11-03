import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';

function makeToken(exp: number): string {
    const payload = btoa(JSON.stringify({ exp })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `header.${payload}.signature`;
}

describe('authGuard', () => {
    const runGuard = () =>
        TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it('laisse passer un utilisateur connecté', () => {
        localStorage.setItem('authToken', makeToken(Date.now() / 1000 + 3600));
        expect(runGuard()).toBe(true);
    });

    it('redirige vers /login un utilisateur non connecté', () => {
        const result = runGuard() as UrlTree;
        expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
    });
});