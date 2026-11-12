import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
})
export class RegisterComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly form = this.fb.group(
        {
            email: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_PATTERN)]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: passwordsMatch },
    );

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

        const { email, password } = this.form.getRawValue();
        this.authService.register({ email, password }).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.router.navigate(['/login'], { queryParams: { registered: true } });
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading.set(false);
                this.errorMessage.set(
                    error.status === 409 ? 'Un compte existe déjà avec cet email.' : 'Une erreur est survenue, réessayez plus tard.',
                );
            },
        });
    }
}