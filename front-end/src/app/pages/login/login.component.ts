import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
})
export class LoginComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    readonly registered = inject(ActivatedRoute).snapshot.queryParamMap.has('registered');
    private readonly fb = inject(NonNullableFormBuilder);

    readonly form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
    });

    readonly submitted = signal(false);
    readonly isLoading = signal(false);
    readonly errorMessage = signal<string | null>(null);

    onSubmit(): void {
        this.submitted.set(true);
        if (this.form.invalid) {
            return;
        }
        this.isLoading.set(true);
        this.errorMessage.set(null);

        this.authService.login(this.form.getRawValue()).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.router.navigate(['/']);
            },
            error: () => {
                this.isLoading.set(false);
                this.errorMessage.set('Email ou mot de passe incorrect');
            },
        });
    }
}