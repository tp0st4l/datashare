package fr.datashare.handler;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Format unique de toutes les erreurs renvoyées par l'API.
 * fieldErrors (champ → message) n'apparaît que pour les erreurs de validation.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorDetails(
        @Schema(description = "Date et heure de l'erreur")
        LocalDateTime timestamp,

        @Schema(description = "Message lisible, affichable à l'utilisateur", example = "Mot de passe incorrect")
        String message,

        @Schema(description = "Route concernée", example = "uri=/api/download/abc/ticket")
        String details,

        @Schema(description = "Présent uniquement pour les erreurs de validation (400) : message par champ invalide",
                example = "{\"email\": \"Le format de l'email est invalide\"}")
        Map<String, String> fieldErrors) {

    public ErrorDetails(LocalDateTime timestamp, String message, String details) {
        this(timestamp, message, details, Map.of());
    }
}
