package fr.datashare.validation;

import java.nio.charset.StandardCharsets;

/** Règles communes aux mots de passe hashés avec BCrypt (comptes et fichiers). */
public final class PasswordRules {

    /**
     * BCrypt ne prend en compte que 72 octets : au-delà, Spring Security refuse de hasher le mot de passe.
     * La limite porte sur les octets UTF-8, pas sur les caractères : « é » compte pour 2.
     */
    public static final int BCRYPT_MAX_BYTES = 72;

    public static final String TOO_LONG_MESSAGE =
            "Le mot de passe est trop long : 72 caractères maximum (moins s'il contient des accents)";

    private PasswordRules() {
    }

    public static boolean exceedsBcryptLimit(String password) {
        return password != null && password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
    }
}
