package fr.datashare.service;

import fr.datashare.entities.User;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Base64;

class JwtServiceTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final long ONE_HOUR = 3_600_000L;

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", ONE_HOUR);

        user = new User();
        user.setEmail("test@datashare.fr");
    }

    @Test
    void generatedToken_containsUserEmail() {
        // WHEN
        String token = jwtService.generateToken(user);

        // THEN
        assertEquals("test@datashare.fr", jwtService.extractUsername(token));
    }

    @Test
    void isTokenValid_trueForSameUser() {
        String token = jwtService.generateToken(user);

        assertTrue(jwtService.isTokenValid(token, user));
    }

    @Test
    void isTokenValid_falseForAnotherUser() {
        String token = jwtService.generateToken(user);
        User other = new User();
        other.setEmail("autre@datashare.fr");

        assertFalse(jwtService.isTokenValid(token, other));
    }

    @Test
    void expiredToken_isRejected() {
        // GIVEN : un token déjà expiré (durée négative)
        ReflectionTestUtils.setField(jwtService, "expirationMs", -1000L);
        String token = jwtService.generateToken(user);

        // WHEN + THEN
        assertThrows(ExpiredJwtException.class, () -> jwtService.isTokenValid(token, user));
    }

    @Test
    void tamperedToken_isRejected() {
        // GIVEN : un attaquant remplace l'email dans le contenu du token, sans pouvoir
        // refaire la signature
        String[] parts = jwtService.generateToken(user).split("\\.");
        String fakePayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"pirate@datashare.fr\"}".getBytes());
        String tampered = parts[0] + "." + fakePayload + "." + parts[2];

        // WHEN + THEN
        assertThrows(JwtException.class, () -> jwtService.extractUsername(tampered));
    }

    @Test
    void tokenSignedWithAnotherSecret_isRejected() {
        // GIVEN : un token signé avec une autre clé
        JwtService otherService = new JwtService();
        ReflectionTestUtils.setField(otherService, "jwtSecret", SECRET.replace('0', 'f'));
        ReflectionTestUtils.setField(otherService, "expirationMs", ONE_HOUR);
        String foreignToken = otherService.generateToken(user);

        // WHEN + THEN
        assertThrows(JwtException.class, () -> jwtService.extractUsername(foreignToken));
    }
}