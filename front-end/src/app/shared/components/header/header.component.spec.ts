import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/service/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    const render = (loggedIn: boolean): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: { loggedIn: signal(loggedIn) } }],
        });
        const fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('affiche « Se connecter » pour un visiteur', () => {
        const button = render(false).querySelector('a.btn');

        expect(button?.textContent?.trim()).toBe('Se connecter');
        expect(button?.getAttribute('href')).toBe('/login');
    });

    it('affiche « Mon espace » pour un utilisateur connecté', () => {
        const button = render(true).querySelector('a.btn');

        expect(button?.textContent?.trim()).toBe('Mon espace');
        expect(button?.getAttribute('href')).toBe('/my-files');
    });
});