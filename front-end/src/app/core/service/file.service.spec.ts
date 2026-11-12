import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FileService } from './file.service';

describe('FileService', () => {
    let service: FileService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(FileService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('upload envoie le fichier, le mot de passe et la durée', () => {
        service.upload(new File(['abc'], 'test.txt'), 'secret12', 3).subscribe();

        const req = httpMock.expectOne('/api/files');
        const body = req.request.body as FormData;
        expect(req.request.method).toBe('POST');
        expect((body.get('file') as File).name).toBe('test.txt');
        expect(body.get('password')).toBe('secret12');
        expect(body.get('expirationDays')).toBe('3');
        req.flush({});
    });

    it("upload sans mot de passe n'envoie pas le champ", () => {
        service.upload(new File(['abc'], 'test.txt'), null, 7).subscribe();

        const req = httpMock.expectOne('/api/files');
        expect((req.request.body as FormData).has('password')).toBe(false);
        req.flush({});
    });

    it('listMine transmet includeExpired', () => {
        service.listMine(true).subscribe();

        const req = httpMock.expectOne((r) => r.url === '/api/files');
        expect(req.request.params.get('includeExpired')).toBe('true');
        req.flush([]);
    });

    it('delete envoie DELETE /api/files/{id}', () => {
        service.delete(5).subscribe();

        const req = httpMock.expectOne('/api/files/5');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('getDownloadInfo envoie GET /api/download/{token}', () => {
        service.getDownloadInfo('abc').subscribe();

        const req = httpMock.expectOne('/api/download/abc');
        expect(req.request.method).toBe('GET');
        req.flush({});
    });

    it('requestTicket envoie le mot de passe', () => {
        service.requestTicket('abc', 'secret12').subscribe();

        const req = httpMock.expectOne('/api/download/abc/ticket');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ password: 'secret12' });
        req.flush({ ticket: 't1' });
    });

    it('fileUrl encode le ticket', () => {
        expect(service.fileUrl('abc', 'a+b')).toBe('/api/download/abc/file?ticket=a%2Bb');
    });
});