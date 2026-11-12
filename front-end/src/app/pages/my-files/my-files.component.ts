import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FileResponse } from '../../core/models/file';
import { FileService } from '../../core/service/file.service';
import { expirationLabel } from '../../shared/utils/expiration-label';
import { formatSize } from '../../shared/utils/format-size';

type FileFilter = 'all' | 'active' | 'expired';

@Component({
    selector: 'app-my-files',
    imports: [DatePipe],
    templateUrl: './my-files.component.html',
    styleUrl: './my-files.component.css',
})
export class MyFilesComponent {
    private readonly fileService = inject(FileService);

    readonly filterOptions: { value: FileFilter; label: string }[] = [
        { value: 'all', label: 'Tous' },
        { value: 'active', label: 'Actifs' },
        { value: 'expired', label: 'Expiré' },
    ];

    readonly files = signal<FileResponse[]>([]);
    readonly filter = signal<FileFilter>('active');
    readonly displayedFiles = computed(() =>
        this.filter() === 'expired' ? this.files().filter((file) => file.expired) : this.files(),
    );
    readonly isLoading = signal(true);
    readonly errorMessage = signal<string | null>(null);
    readonly pendingDeleteId = signal<number | null>(null);

    readonly formatSize = formatSize;
    readonly expirationLabel = expirationLabel;

    constructor() {
        this.loadFiles();
    }

    loadFiles(): void {
        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.fileService.listMine(this.filter() !== 'active').subscribe({
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

    setFilter(filter: FileFilter): void {
        if (filter === this.filter()) {
            return;
        }
        this.filter.set(filter);
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