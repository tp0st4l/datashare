import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DownloadInfo, FileResponse } from '../models/file';

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

    download(token: string, password: string | null): Observable<Blob> {
        return this.http.post(`/api/download/${token}`, { password }, { responseType: 'blob' });
    }
}