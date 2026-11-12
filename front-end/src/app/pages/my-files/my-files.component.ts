import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileResponse } from '../../core/models/file';
import { FileService } from '../../core/service/file.service';
import { formatSize } from '../../shared/utils/format-size';

@Component({
    selector: 'app-my-files',
    imports: [DatePipe, RouterLink],
    templateUrl: './my-files.component.html',
})
export class MyFilesComponent {
    private readonly fileService = inject(FileService);

    readonly files = signal<FileResponse[]>([]);
    readonly includeExpired = signal(false);
    readonly isLoading = signal(true);
    readonly errorMessage = signal<string | null>(null);
    readonly pendingDeleteId = signal<number | null>(null);

    readonly formatSize = formatSize;

    constructor() {
        this.loadFiles();
    }

    loadFiles(): void {
        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.fileService.listMine(this.includeExpired()).subscribe({
            next: (files) => {
                this.files.set(files);
                this.isLoading.set(false);
            },
            error: () => {
                this.errorMessage.set('Impossible de charger vos fichiers.');
                this.isLoading.set(false);
            },
        });
    }

    toggleExpired(event: Event): void {
        this.includeExpired.set((event.target as HTMLInputElement).checked);
        this.loadFiles();
    }

    askDelete(id: number): void {
        this.pendingDeleteId.set(id);
    }

    cancelDelete(): void {
        this.pendingDeleteId.set(null);
    }

    confirmDelete(id: number): void {
        this.fileService.delete(id).subscribe({
            next: () => {
                this.files.update((files) => files.filter((file) => file.id !== id));
                this.pendingDeleteId.set(null);
            },
            error: () => {
                this.errorMessage.set('La suppression a échoué, réessayez plus tard.');
                this.pendingDeleteId.set(null);
            },
        });
    }

    shareLink(token: string): string {
        return `${window.location.origin}/download/${token}`;
    }
}