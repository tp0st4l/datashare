import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/service/auth.service';
import { SpaceLayoutComponent } from './space-layout.component';

describe('SpaceLayoutComponent', () => {
    const authServiceMock = { me: vi.fn(), logout: vi.fn() };
    let component: SpaceLayoutComponent;
    let router: Router;

    beforeEach(() => {
        authServiceMock.me.mockReturnValue(of({ email: 'test@datashare.fr' }));
        authServiceMock.logout.mockReset();
        TestBed.configureTestingModule({
            imports: [SpaceLayoutComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
        });
        component = TestBed.createComponent(SpaceLayoutComponent).componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it("affiche l'email de l'utilisateur connecté", () => {
        expect(component.email()).toBe('test@datashare.fr');
    });

    it('ouvre et ferme le menu', () => {
        component.openMenu();
        expect(component.menuOpen()).toBe(true);

        component.closeMenu();
        expect(component.menuOpen()).toBe(false);
    });

    it('ferme le menu avec la touche Échap', () => {
        const fixture = TestBed.createComponent(SpaceLayoutComponent);
        fixture.componentInstance.openMenu();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it("se déconnecte et revient à l'accueil", () => {
        component.logout();

        expect(authServiceMock.logout).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
});