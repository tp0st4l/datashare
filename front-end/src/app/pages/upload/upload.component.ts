import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/service/auth.service';
import { FileService } from '../../core/service/file.service';
import { formatSize } from '../../shared/utils/format-size';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;

// Même liste que FileService.java (le back-end reste la vraie protection)
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'sh', 'ps1', 'vbs', 'jar'];

function fileErrorFor(file: File | null): string | null {
    if (!file) {
        return null;
    }
    const extension = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : '';
    if (FORBIDDEN_EXTENSIONS.includes(extension)) {
        return "Ce type de fichier n'est pas autorisé";
    }
    if (file.size > MAX_FILE_SIZE) {
        return 'La taille des fichiers est limitée à 1 Go';
    }
    return null;
}

interface UploadedFile {
    name: string;
    size: number;
    duration: string;
}

@Component({
    selector: 'app-upload',
    imports: [ReactiveFormsModule],
    templateUrl: './upload.component.html',
    styleUrl: './upload.component.css',
})
export class UploadComponent {
    private readonly fileService = inject(FileService);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    readonly loggedIn = inject(AuthService).loggedIn;

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

    readonly selectedFile = signal<File | null>(null);
    readonly fileError = signal<string | null>(null);
    readonly submitted = signal(false);
    readonly isLoading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly uploaded = signal<UploadedFile | null>(null);
    readonly shareLink = signal<string | null>(null);
    readonly copied = signal(false);
    readonly tooLarge = computed(() => (this.selectedFile()?.size ?? 0) > MAX_FILE_SIZE);

    readonly formatSize = formatSize;

    pickFile(fileInput: HTMLInputElement): void {
        if (!this.loggedIn()) {
            this.router.navigate(['/login']);
            return;
        }
        fileInput.click();
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        this.selectedFile.set(file);
        this.uploaded.set(null);
        this.shareLink.set(null);
        this.copied.set(false);
        this.errorMessage.set(null);
        this.fileError.set(fileErrorFor(file));
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
                this.uploaded.set({ name: file.name, size: file.size, duration: this.durationLabel(expirationDays) });
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

    startOver(fileInput: HTMLInputElement): void {
        this.uploaded.set(null);
        this.shareLink.set(null);
        this.copied.set(false);
        fileInput.value = '';
    }

    private durationLabel(days: number): string {
        return this.durations.find((duration) => duration.value === days)?.label.toLowerCase() ?? `${days} jours`;
    }
}