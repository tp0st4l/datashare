package fr.datashare.handler;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Format unique de toutes les erreurs renvoyées par l'API.
 * fieldErrors (champ → message) n'apparaît que pour les erreurs de validation.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorDetails(LocalDateTime timestamp, String message, String details, Map<String, String> fieldErrors) {

    public ErrorDetails(LocalDateTime timestamp, String message, String details) {
        this(timestamp, message, details, Map.of());
    }
}
