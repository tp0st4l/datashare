import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DownloadInfo, DownloadTicket, FileResponse } from '../models/file';

@Injectable({ providedIn: 'root' })
export class FileService {
    private readonly http = inject(HttpClient);

    upload(file: File, password: string | null, expirationDays: number): Observable<FileResponse> {
        const formData = new FormData();
        formData.append('file', file);
        if (password) {
            formData.append('password', password);
        }
        formData.append('expirationDays', String(expirationDays));
        return this.http.post<FileResponse>('/api/files', formData);
    }

    listMine(includeExpired = false): Observable<FileResponse[]> {
        return this.http.get<FileResponse[]>('/api/files', { params: { includeExpired } });
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`/api/files/${id}`);
    }

    getDownloadInfo(token: string): Observable<DownloadInfo> {
        return this.http.get<DownloadInfo>(`/api/download/${token}`);
    }

    requestTicket(token: string, password: string | null): Observable<DownloadTicket> {
        return this.http.post<DownloadTicket>(`/api/download/${token}/ticket`, { password });
    }

    fileUrl(token: string, ticket: string): string {
        return `/api/download/${token}/file?ticket=${encodeURIComponent(ticket)}`;
    }
}