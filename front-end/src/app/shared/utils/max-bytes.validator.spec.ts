import { FormControl } from '@angular/forms';
import { maxBytes } from './max-bytes.validator';

describe('maxBytes', () => {
    const validator = maxBytes(72);

    it('accepte une valeur vide', () => {
        expect(validator(new FormControl(''))).toBeNull();
    });

    it('accepte exactement 72 octets', () => {
        expect(validator(new FormControl('a'.repeat(72)))).toBeNull();
    });

    it('refuse 73 octets', () => {
        expect(validator(new FormControl('a'.repeat(73)))).toEqual({ maxBytes: { max: 72, actual: 73 } });
    });

    it('compte les octets et non les caractères', () => {
        // 40 caractères accentués = 80 octets en UTF-8
        expect(validator(new FormControl('é'.repeat(40)))).toEqual({ maxBytes: { max: 72, actual: 80 } });
    });
});
