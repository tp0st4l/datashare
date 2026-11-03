import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

@Component({
    selector: 'app-upload',
    template: `
    <h1>Accueil connecté</h1>
    <p>Connecté en tant que : {{ email() }}</p>
    <button type="button" (click)="logout()">Déconnexion</button>
    `,
})
export class UploadComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly email = signal('');

    constructor() {
        this.authService.me().subscribe((me) => this.email.set(me.email));
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}