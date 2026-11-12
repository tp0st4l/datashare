export interface FileResponse {
    id: number;
    token: string;
    originalName: string;
    contentType: string;
    size: number;
    createdAt: string;
    expiresAt: string;
    passwordProtected: boolean;
    expired: boolean;
}

export interface DownloadInfo {
    originalName: string;
    contentType: string;
    size: number;
    expiresAt: string;
    passwordProtected: boolean;
}

export interface DownloadTicket {
    ticket: string;
}