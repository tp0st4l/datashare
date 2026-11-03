import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/service/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    const authServiceMock = { login: vi.fn() };
    let component: LoginComponent;
    let router: Router;

    beforeEach(() => {
        authServiceMock.login.mockReset();
        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
        });
        component = TestBed.createComponent(LoginComponent).componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it("n'appelle pas le service si le formulaire est vide", () => {
        component.onSubmit();

        expect(component.submitted()).toBe(true);
        expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it("se connecte puis redirige vers l'accueil", () => {
        authServiceMock.login.mockReturnValue(of({ accessToken: 'abc' }));
        component.form.setValue({ email: 'test@datashare.fr', password: 'motdepasse' });

        component.onSubmit();

        expect(authServiceMock.login).toHaveBeenCalledWith({ email: 'test@datashare.fr', password: 'motdepasse' });
        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(component.isLoading()).toBe(false);
    });

    it('affiche un message si les identifiants sont refusés', () => {
        authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
        component.form.setValue({ email: 'test@datashare.fr', password: 'mauvais' });

        component.onSubmit();

        expect(component.errorMessage()).toBe('Email ou mot de passe incorrect');
        expect(router.navigate).not.toHaveBeenCalled();
    });
});