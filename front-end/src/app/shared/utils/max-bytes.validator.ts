import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const encoder = new TextEncoder();

/**
 * Refuse une valeur dont l'encodage UTF-8 dépasse `max` octets.
 * Sert pour les mots de passe : BCrypt, côté serveur, est limité à 72 octets ("é" en compte 2).
 */
export function maxBytes(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) {
            return null;
        }
        const bytes = encoder.encode(value).length;
        return bytes > max ? { maxBytes: { max, actual: bytes } } : null;
    };
}

export const PASSWORD_MAX_BYTES = 72;
