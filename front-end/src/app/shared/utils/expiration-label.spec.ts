import { expirationLabel } from './expiration-label';

describe('expirationLabel', () => {
    const now = new Date(2026, 10, 12, 10, 0);

    it('indique un fichier expiré', () => {
        expect(expirationLabel(new Date(2026, 10, 11, 10, 0).toISOString(), now)).toBe('Expiré');
    });

    it("indique une expiration aujourd'hui", () => {
        expect(expirationLabel(new Date(2026, 10, 12, 18, 0).toISOString(), now)).toBe("Expire aujourd'hui");
    });

    it('indique une expiration demain', () => {
        expect(expirationLabel(new Date(2026, 10, 13, 9, 0).toISOString(), now)).toBe('Expire demain');
    });

    it('compte les jours restants', () => {
        expect(expirationLabel(new Date(2026, 10, 15, 10, 0).toISOString(), now)).toBe('Expire dans 3 jours');
    });
});