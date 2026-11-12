import { formatSize } from './format-size';

describe('formatSize', () => {
    it('affiche les octets', () => {
        expect(formatSize(500)).toBe('500 o');
    });

    it('arrondit au dixième', () => {
        expect(formatSize(2.6 * 1024 * 1024)).toBe('2,6 Mo');
    });

    it("s'arrête au Go", () => {
        expect(formatSize(1024 ** 3)).toBe('1 Go');
    });
});