import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

@Component({
    selector: 'app-space-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './space-layout.component.html',
    styleUrl: './space-layout.component.css',
    host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class SpaceLayoutComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly menuOpen = signal(false);
    readonly email = signal('');

    constructor() {
        this.authService.me().subscribe((me) => this.email.set(me.email));
    }

    openMenu(): void {
        this.menuOpen.set(true);
    }

    closeMenu(): void {
        this.menuOpen.set(false);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/']);
    }
}