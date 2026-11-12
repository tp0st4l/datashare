package fr.datashare.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    private static final String TYPE_CLAIM = "type";
    private static final String DOWNLOAD_TYPE = "download";

    @Value("${jwt.download-ticket-expiration-ms}")
    private long downloadTicketExpirationMs;

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        return extractUsername(token).equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public String generateDownloadTicket(String fileToken) {
        return Jwts.builder()
                .subject(fileToken)
                .claim(TYPE_CLAIM, DOWNLOAD_TYPE)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + downloadTicketExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public boolean isDownloadTicketValid(String ticket, String fileToken) {
        try {
            Claims claims = extractClaim(ticket, c -> c);
            return DOWNLOAD_TYPE.equals(claims.get(TYPE_CLAIM, String.class))
                    && fileToken.equals(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claimsResolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}