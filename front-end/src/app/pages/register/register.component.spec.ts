import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/service/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
    const authServiceMock = { register: vi.fn() };
    let component: RegisterComponent;
    let router: Router;

    const fillForm = (confirmPassword = 'motdepasse') =>
        component.form.setValue({ email: 'nouveau@datashare.fr', password: 'motdepasse', confirmPassword });

    beforeEach(() => {
        authServiceMock.register.mockReset();
        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
        });
        component = TestBed.createComponent(RegisterComponent).componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('refuse deux mots de passe différents', () => {
        fillForm('autrechose');

        component.onSubmit();

        expect(component.form.errors?.['passwordsMismatch']).toBe(true);
        expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    it("envoie email et mot de passe (sans la vérification) puis redirige vers /login", () => {
        authServiceMock.register.mockReturnValue(of(undefined));
        fillForm();

        component.onSubmit();

        expect(authServiceMock.register).toHaveBeenCalledWith({ email: 'nouveau@datashare.fr', password: 'motdepasse' });
        expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: true } });
    });

    it('affiche un message dédié si l’email est déjà pris (409)', () => {
        authServiceMock.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
        fillForm();

        component.onSubmit();

        expect(component.errorMessage()).toBe('Un compte existe déjà avec cet email.');
    });

    it('affiche un message générique pour une autre erreur', () => {
        authServiceMock.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        fillForm();

        component.onSubmit();

        expect(component.errorMessage()).toBe('Une erreur est survenue, réessayez plus tard.');
    });

    it('refuse un email sans extension de domaine', () => {
        component.form.setValue({ email: 'marie@edr', password: 'motdepasse', confirmPassword: 'motdepasse' });

        component.onSubmit();

        expect(component.form.controls.email.errors?.['pattern']).toBeTruthy();
        expect(authServiceMock.register).not.toHaveBeenCalled();
    });
});