import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/service/auth.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
    const authServiceMock = { me: vi.fn(), logout: vi.fn() };

    beforeEach(() => {
        authServiceMock.me.mockReturnValue(of({ email: 'test@datashare.fr' }));
        TestBed.configureTestingModule({
            imports: [UploadComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
        });
    });

    it("affiche l'email de l'utilisateur connecté", () => {
        const component = TestBed.createComponent(UploadComponent).componentInstance;
        expect(component.email()).toBe('test@datashare.fr');
    });

    it('se déconnecte et revient à /login', () => {
        const component = TestBed.createComponent(UploadComponent).componentInstance;
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);

        component.logout();

        expect(authServiceMock.logout).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
});