package fr.datashare.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Journalise chaque appel à l'API : méthode, route, code HTTP et temps de réponse.
 * Placé avant Spring Security pour mesurer aussi les requêtes refusées (401).
 * Le token des liens de partage est masqué, et les paramètres (ticket) ne sont jamais journalisés.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestMetricsFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - start) / 1_000_000;
            log.info("{} {} {} {} ms", request.getMethod(), maskShareToken(request.getRequestURI()),
                    response.getStatus(), durationMs);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    private static String maskShareToken(String path) {
        return path.replaceFirst("^/api/download/[^/]+", "/api/download/{token}");
    }
}
