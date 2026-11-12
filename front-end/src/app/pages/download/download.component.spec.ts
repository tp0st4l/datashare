import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DownloadInfo } from '../../core/models/file';
import { FileService } from '../../core/service/file.service';
import { DownloadComponent } from './download.component';

const protectedInfo: DownloadInfo = {
    originalName: 'test.txt',
    contentType: 'text/plain',
    size: 18,
    expiresAt: '2026-11-19T10:00:00',
    passwordProtected: true,
};

describe('DownloadComponent', () => {
    const fileServiceMock = { getDownloadInfo: vi.fn(), requestTicket: vi.fn(), fileUrl: vi.fn() };

    const create = () => {
        const component = TestBed.createComponent(DownloadComponent).componentInstance;
        vi.spyOn(component, 'startDownload').mockImplementation(() => { });
        return component;
    };

    beforeEach(() => {
        fileServiceMock.getDownloadInfo.mockReset();
        fileServiceMock.requestTicket.mockReset();
        fileServiceMock.getDownloadInfo.mockReturnValue(of(protectedInfo));
        fileServiceMock.fileUrl.mockImplementation((token: string, ticket: string) => `/api/download/${token}/file?ticket=${ticket}`);
        TestBed.configureTestingModule({
            imports: [DownloadComponent],
            providers: [
                { provide: FileService, useValue: fileServiceMock },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'abc' }) } } },
            ],
        });
    });

    it('affiche les infos du fichier', () => {
        const component = create();

        expect(fileServiceMock.getDownloadInfo).toHaveBeenCalledWith('abc');
        expect(component.info()).toEqual(protectedInfo);
    });

    it('signale un lien expiré (410)', () => {
        fileServiceMock.getDownloadInfo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 410 })));

        expect(create().pageError()).toBe("Ce fichier n'est plus disponible en téléchargement car il a expiré.");
    });

    it('signale un lien invalide (404)', () => {
        fileServiceMock.getDownloadInfo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        expect(create().pageError()).toBe('Ce lien de téléchargement est invalide.');
    });

    it('exige le mot de passe pour un fichier protégé', () => {
        const component = create();

        component.onDownload();

        expect(component.submitted()).toBe(true);
        expect(fileServiceMock.requestTicket).not.toHaveBeenCalled();
    });

    it('télécharge avec le ticket obtenu', () => {
        fileServiceMock.requestTicket.mockReturnValue(of({ ticket: 't1' }));
        const component = create();
        component.form.setValue({ password: 'secret12' });

        component.onDownload();

        expect(fileServiceMock.requestTicket).toHaveBeenCalledWith('abc', 'secret12');
        expect(component.startDownload).toHaveBeenCalledWith('/api/download/abc/file?ticket=t1');
    });

    it("n'envoie pas de mot de passe pour un fichier non protégé", () => {
        fileServiceMock.getDownloadInfo.mockReturnValue(of({ ...protectedInfo, passwordProtected: false }));
        fileServiceMock.requestTicket.mockReturnValue(of({ ticket: 't1' }));
        const component = create();

        component.onDownload();

        expect(fileServiceMock.requestTicket).toHaveBeenCalledWith('abc', null);
    });

    it.each([
        [403, 'Mot de passe incorrect.'],
        [410, "Ce fichier n'est plus disponible en téléchargement car il a expiré."],
        [404, 'Ce lien de téléchargement est invalide.'],
        [500, 'Le téléchargement a échoué, réessayez plus tard.'],
    ])('affiche le bon message pour une erreur %i', (status, message) => {
        fileServiceMock.requestTicket.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
        const component = create();
        component.form.setValue({ password: 'secret12' });

        component.onDownload();

        expect(component.downloadError()).toBe(message);
        expect(component.startDownload).not.toHaveBeenCalled();
    });

    it("signale en urgence une expiration le lendemain", () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fileServiceMock.getDownloadInfo.mockReturnValue(of({ ...protectedInfo, expiresAt: tomorrow.toISOString() }));

        expect(create().expiryNotice()).toEqual({ text: 'Ce fichier expirera demain', urgent: true });
    });
});