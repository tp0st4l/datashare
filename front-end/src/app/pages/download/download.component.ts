import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DownloadInfo } from '../../core/models/file';
import { FileService } from '../../core/service/file.service';
import { formatSize } from '../../shared/utils/format-size';
import { daysUntilExpiration } from '../../shared/utils/expiration-label';

const EXPIRED_MESSAGE = "Ce fichier n'est plus disponible en téléchargement car il a expiré.";
const INVALID_MESSAGE = 'Ce lien de téléchargement est invalide.';

@Component({
    selector: 'app-download',
    imports: [DatePipe, ReactiveFormsModule],
    templateUrl: './download.component.html',
})
export class DownloadComponent {
    private readonly fileService = inject(FileService);
    private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

    readonly form = inject(NonNullableFormBuilder).group({
        password: ['', Validators.required],
    });

    readonly info = signal<DownloadInfo | null>(null);
    readonly isLoading = signal(true);
    readonly pageError = signal<string | null>(null);
    readonly downloadError = signal<string | null>(null);
    readonly isDownloading = signal(false);
    readonly submitted = signal(false);

    readonly formatSize = formatSize;

    readonly expiryNotice = computed(() => {
        const info = this.info();
        if (!info) {
            return null;
        }
        const days = daysUntilExpiration(info.expiresAt);
        const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
        return { text: `Ce fichier expirera ${when}`, urgent: days <= 1 };
    });

    constructor() {
        this.fileService.getDownloadInfo(this.token).subscribe({
            next: (info) => {
                this.info.set(info);
                this.isLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading.set(false);
                this.pageError.set(error.status === 410 ? EXPIRED_MESSAGE : INVALID_MESSAGE);
            },
        });
    }

    onDownload(): void {
        const info = this.info();
        if (!info) {
            return;
        }
        this.submitted.set(true);
        if (info.passwordProtected && this.form.invalid) {
            return;
        }
        this.isDownloading.set(true);
        this.downloadError.set(null);

        const password = info.passwordProtected ? this.form.getRawValue().password : null;
        this.fileService.requestTicket(this.token, password).subscribe({
            next: ({ ticket }) => {
                this.isDownloading.set(false);
                this.startDownload(this.fileService.fileUrl(this.token, ticket));
            },
            error: (error: HttpErrorResponse) => {
                this.isDownloading.set(false);
                this.downloadError.set(this.messageFor(error.status));
            },
        });
    }

    private messageFor(status: number): string {
        switch (status) {
            case 403:
                return 'Mot de passe incorrect.';
            case 410:
                return EXPIRED_MESSAGE;
            case 404:
                return INVALID_MESSAGE;
            default:
                return 'Le téléchargement a échoué, réessayez plus tard.';
        }
    }

    startDownload(url: string): void {
        window.location.assign(url);
    }
}