import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FileResponse } from '../../core/models/file';
import { FileService } from '../../core/service/file.service';
import { MyFilesComponent } from './my-files.component';

const makeFile = (id: number, name: string, expired = false): FileResponse => ({
    id,
    token: `token-${id}`,
    originalName: name,
    contentType: 'text/plain',
    size: 10,
    createdAt: '2026-11-12T10:00:00',
    expiresAt: '2026-11-19T10:00:00',
    passwordProtected: false,
    expired,
});

describe('MyFilesComponent', () => {
    const fileServiceMock = { listMine: vi.fn(), delete: vi.fn() };
    let component: MyFilesComponent;

    const create = () => TestBed.createComponent(MyFilesComponent).componentInstance;

    beforeEach(() => {
        fileServiceMock.listMine.mockReset();
        fileServiceMock.delete.mockReset();
        fileServiceMock.listMine.mockReturnValue(of([makeFile(1, 'a.txt'), makeFile(2, 'b.txt')]));
        TestBed.configureTestingModule({
            imports: [MyFilesComponent],
            providers: [{ provide: FileService, useValue: fileServiceMock }],
        });
        component = create();
    });

    it('charge les fichiers actifs par défaut', () => {
        expect(component.filter()).toBe('active');
        expect(fileServiceMock.listMine).toHaveBeenCalledWith(false);
        expect(component.displayedFiles().length).toBe(2);
    });

    it('recharge avec les expirés pour le filtre « Tous »', () => {
        component.setFilter('all');

        expect(fileServiceMock.listMine).toHaveBeenLastCalledWith(true);
    });

    it("n'affiche que les expirés pour le filtre « Expiré »", () => {
        fileServiceMock.listMine.mockReturnValue(of([makeFile(1, 'a.txt'), makeFile(3, 'vieux.txt', true)]));

        component.setFilter('expired');

        expect(fileServiceMock.listMine).toHaveBeenLastCalledWith(true);
        expect(component.displayedFiles().map((file) => file.id)).toEqual([3]);
    });

    it('ne recharge pas si le filtre est déjà sélectionné', () => {
        component.setFilter('active');

        expect(fileServiceMock.listMine).toHaveBeenCalledTimes(1);
    });

    it('affiche une erreur si le chargement échoue', () => {
        fileServiceMock.listMine.mockReturnValue(throwError(() => new Error('serveur')));

        const failing = create();

        expect(failing.errorMessage()).toBe('Impossible de charger vos fichiers.');
        expect(failing.isLoading()).toBe(false);
    });

    it('annule la suppression', () => {
        component.askDelete(1);
        expect(component.pendingDeleteId()).toBe(1);

        component.cancelDelete();

        expect(component.pendingDeleteId()).toBeNull();
        expect(fileServiceMock.delete).not.toHaveBeenCalled();
    });

    it('supprime après confirmation', () => {
        fileServiceMock.delete.mockReturnValue(of(undefined));
        component.askDelete(1);

        component.confirmDelete(1);

        expect(fileServiceMock.delete).toHaveBeenCalledWith(1);
        expect(component.files().map((file) => file.id)).toEqual([2]);
        expect(component.pendingDeleteId()).toBeNull();
    });

    it('garde la liste si la suppression échoue', () => {
        fileServiceMock.delete.mockReturnValue(throwError(() => new Error('serveur')));

        component.confirmDelete(1);

        expect(component.errorMessage()).toBe('La suppression a échoué, réessayez plus tard.');
        expect(component.files().length).toBe(2);
    });

    it('construit le lien de partage', () => {
        expect(component.shareLink('abc')).toBe(`${window.location.origin}/download/abc`);
    });
});