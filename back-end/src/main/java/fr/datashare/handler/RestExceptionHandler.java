package fr.datashare.handler;

import fr.datashare.exception.EmailAlreadyUsedException;
import fr.datashare.exception.FileAccessDeniedException;
import fr.datashare.exception.FileExpiredException;
import fr.datashare.exception.InvalidFileException;
import fr.datashare.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduit toutes les exceptions en réponses HTTP au format ErrorDetails :
 * exceptions métier, erreurs techniques gérées par Spring, et erreurs inattendues.
 */
@Slf4j
@RestControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {

    // ---------- Exceptions métier ----------

    @ExceptionHandler(EmailAlreadyUsedException.class)
    public ResponseEntity<ErrorDetails> handleEmailAlreadyUsed(EmailAlreadyUsedException ex, WebRequest request) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorDetails> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ErrorDetails> handleInvalidFile(InvalidFileException ex, WebRequest request) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleNotFound(ResourceNotFoundException ex, WebRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(FileExpiredException.class)
    public ResponseEntity<ErrorDetails> handleExpired(FileExpiredException ex, WebRequest request) {
        return error(HttpStatus.GONE, ex.getMessage(), request);
    }

    @ExceptionHandler(FileAccessDeniedException.class)
    public ResponseEntity<ErrorDetails> handleFileAccessDenied(FileAccessDeniedException ex, WebRequest request) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    // ---------- Erreurs techniques gérées par Spring ----------

    /** Validation des DTO (@Valid) : 400 avec le message de chaque champ invalide. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fieldError -> fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage()));
        ErrorDetails body = new ErrorDetails(LocalDateTime.now(), "Données invalides",
                request.getDescription(false), fieldErrors);
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    /**
     * Point de passage de toutes les autres erreurs techniques de Spring
     * (paramètre manquant, JSON illisible, fichier trop volumineux, route inconnue…) :
     * on remplace leur format par défaut (ProblemDetail) par ErrorDetails.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode statusCode, WebRequest request) {
        ErrorDetails details = new ErrorDetails(LocalDateTime.now(), messageFor(statusCode),
                request.getDescription(false));
        return super.handleExceptionInternal(ex, details, headers, statusCode, request);
    }

    // ---------- Erreurs inattendues ----------

    /** Toute autre exception : 500, sans exposer le détail interne au client, mais journalisée. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetails> handleUnexpected(Exception ex, WebRequest request) {
        log.error("Erreur inattendue sur {}", request.getDescription(false), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur interne est survenue, réessayez plus tard", request);
    }

    // ---------- Outils ----------

    private static ResponseEntity<ErrorDetails> error(HttpStatus status, String message, WebRequest request) {
        ErrorDetails body = new ErrorDetails(LocalDateTime.now(), message, request.getDescription(false));
        return ResponseEntity.status(status).body(body);
    }

    private static String messageFor(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "Requête invalide : paramètre manquant ou mal formé";
            case 404 -> "Ressource introuvable";
            case 405 -> "Méthode HTTP non autorisée sur cette route";
            case 413 -> "Fichier trop volumineux : 1 Go maximum";
            case 415 -> "Type de contenu non pris en charge";
            default -> "Une erreur est survenue";
        };
    }
}
