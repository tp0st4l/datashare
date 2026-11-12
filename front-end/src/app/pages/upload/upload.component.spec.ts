import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/service/auth.service';
import { FileService } from '../../core/service/file.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
    const loggedIn = signal(true);
    const fileServiceMock = { upload: vi.fn() };
    let component: UploadComponent;
    let router: Router;

    const selectFile = (file: File) => component.onFileSelected({ target: { files: [file] } } as unknown as Event);
    const textFile = () => new File(['hello'], 'test.txt');

    beforeEach(() => {
        loggedIn.set(true);
        fileServiceMock.upload.mockReset();
        TestBed.configureTestingModule({
            imports: [UploadComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { loggedIn } },
                { provide: FileService, useValue: fileServiceMock },
            ],
        });
        component = TestBed.createComponent(UploadComponent).componentInstance;
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('envoie un visiteur vers la connexion au lieu d’ouvrir le sélecteur', () => {
        loggedIn.set(false);
        const input = document.createElement('input');
        const clickSpy = vi.spyOn(input, 'click');

        component.pickFile(input);

        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('ouvre le sélecteur de fichier pour un utilisateur connecté', () => {
        const input = document.createElement('input');
        const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => { });

        component.pickFile(input);

        expect(clickSpy).toHaveBeenCalled();
    });

    it('refuse un envoi sans fichier', () => {
        component.onSubmit(document.createElement('input'));

        expect(component.fileError()).toBe('Choisissez un fichier.');
        expect(fileServiceMock.upload).not.toHaveBeenCalled();
    });

    it("refuse un fichier de plus d'1 Go", () => {
        const bigFile = new File(['x'], 'gros.bin');
        Object.defineProperty(bigFile, 'size', { value: 2 * 1024 ** 3 });
        selectFile(bigFile);

        component.onSubmit(document.createElement('input'));

        expect(component.fileError()).toBe('La taille des fichiers est limitée à 1 Go');
        expect(fileServiceMock.upload).not.toHaveBeenCalled();
    });

    it('refuse une extension interdite avant tout envoi', () => {
        selectFile(new File(['echo'], 'script.SH'));

        component.onSubmit(document.createElement('input'));

        expect(component.fileError()).toBe("Ce type de fichier n'est pas autorisé");
        expect(component.tooLarge()).toBe(false);
        expect(fileServiceMock.upload).not.toHaveBeenCalled();
    });

    it('refuse un mot de passe trop court', () => {
        selectFile(textFile());
        component.form.setValue({ password: 'abc', expirationDays: 7 });

        component.onSubmit(document.createElement('input'));

        expect(fileServiceMock.upload).not.toHaveBeenCalled();
    });

    it('téléverse, affiche le succès et réinitialise le formulaire', () => {
        fileServiceMock.upload.mockReturnValue(of({ token: 'abc' }));
        selectFile(textFile());
        component.form.setValue({ password: 'secret12', expirationDays: 3 });

        component.onSubmit(document.createElement('input'));

        expect(fileServiceMock.upload).toHaveBeenCalledWith(expect.any(File), 'secret12', 3);
        expect(component.uploaded()).toEqual({ name: 'test.txt', size: 5, duration: '3 jours' });
        expect(component.shareLink()).toBe(`${window.location.origin}/download/abc`);
        expect(component.form.getRawValue()).toEqual({ password: '', expirationDays: 7 });
        expect(component.selectedFile()).toBeNull();
    });

    it("envoie null quand aucun mot de passe n'est saisi", () => {
        fileServiceMock.upload.mockReturnValue(of({ token: 'abc' }));
        selectFile(textFile());

        component.onSubmit(document.createElement('input'));

        expect(fileServiceMock.upload).toHaveBeenCalledWith(expect.any(File), null, 7);
        expect(component.uploaded()?.duration).toBe('une semaine');
    });

    it('affiche le message renvoyé par le back-end', () => {
        fileServiceMock.upload.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, error: { message: "Ce type de fichier n'est pas autorisé" } })),
        );
        selectFile(textFile());

        component.onSubmit(document.createElement('input'));

        expect(component.errorMessage()).toBe("Ce type de fichier n'est pas autorisé");
    });

    it('affiche un message générique sans message du back-end', () => {
        fileServiceMock.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        selectFile(textFile());

        component.onSubmit(document.createElement('input'));

        expect(component.errorMessage()).toBe('Le téléversement a échoué, réessayez plus tard.');
    });

    it('copie le lien dans le presse-papiers', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        component.shareLink.set('http://localhost:4200/download/abc');

        component.copyLink();

        expect(writeText).toHaveBeenCalledWith('http://localhost:4200/download/abc');
        await vi.waitFor(() => expect(component.copied()).toBe(true));
    });

    it("revient à l'accueil avec « Partager un autre fichier »", () => {
        component.uploaded.set({ name: 'test.txt', size: 5, duration: 'une semaine' });
        component.shareLink.set('http://localhost:4200/download/abc');

        component.startOver(document.createElement('input'));

        expect(component.uploaded()).toBeNull();
        expect(component.shareLink()).toBeNull();
    });
});