import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';
import { FileService } from '../../core/service/file.service';
import { formatSize } from '../../shared/utils/format-size';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;

@Component({
    selector: 'app-upload',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './upload.component.html',
})
export class UploadComponent {
    private readonly authService = inject(AuthService);
    private readonly fileService = inject(FileService);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly durations = [
        { value: 1, label: 'Une journée' },
        { value: 2, label: '2 jours' },
        { value: 3, label: '3 jours' },
        { value: 4, label: '4 jours' },
        { value: 5, label: '5 jours' },
        { value: 6, label: '6 jours' },
        { value: 7, label: 'Une semaine' },
    ];

    readonly form = this.fb.group({
        password: ['', Validators.minLength(6)],
        expirationDays: [7],
    });

    readonly email = signal('');
    readonly selectedFile = signal<File | null>(null);
    readonly fileError = signal<string | null>(null);
    readonly submitted = signal(false);
    readonly isLoading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly shareLink = signal<string | null>(null);
    readonly copied = signal(false);

    readonly formatSize = formatSize;

    constructor() {
        this.authService.me().subscribe((me) => this.email.set(me.email));
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        this.selectedFile.set(file);
        this.shareLink.set(null);
        this.errorMessage.set(null);
        this.fileError.set(file && file.size > MAX_FILE_SIZE ? 'La taille des fichiers est limitée à 1 Go' : null);
    }

    onSubmit(fileInput: HTMLInputElement): void {
        this.submitted.set(true);
        const file = this.selectedFile();
        if (!file) {
            this.fileError.set('Choisissez un fichier.');
            return;
        }
        if (this.fileError() || this.form.invalid) {
            return;
        }
        this.isLoading.set(true);
        this.errorMessage.set(null);

        const { password, expirationDays } = this.form.getRawValue();
        this.fileService.upload(file, password || null, expirationDays).subscribe({
            next: (response) => {
                this.isLoading.set(false);
                this.shareLink.set(`${window.location.origin}/download/${response.token}`);
                this.form.reset();
                this.submitted.set(false);
                this.selectedFile.set(null);
                fileInput.value = '';
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading.set(false);
                this.errorMessage.set(error.error?.message ?? 'Le téléversement a échoué, réessayez plus tard.');
            },
        });
    }

    copyLink(): void {
        const link = this.shareLink();
        if (link) {
            navigator.clipboard.writeText(link).then(() => this.copied.set(true));
        }
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}