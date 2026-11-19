package fr.datashare.controller;

import fr.datashare.dto.DownloadInfoDTO;
import fr.datashare.dto.DownloadRequestDTO;
import fr.datashare.dto.DownloadTicketDTO;
import fr.datashare.entities.StoredFile;
import fr.datashare.exception.FileAccessDeniedException;
import fr.datashare.handler.ErrorDetails;
import fr.datashare.service.FileService;
import fr.datashare.service.JwtService;
import fr.datashare.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@Tag(name = "Téléchargement", description = "Accès public à un fichier partagé, à partir du token de son lien")
@ApiResponse(responseCode = "404", description = "Lien inconnu",
        content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
@ApiResponse(responseCode = "410", description = "Fichier expiré",
        content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
@RequestMapping("/api/download")
@RequiredArgsConstructor
public class DownloadController {

    private final FileService fileService;
    private final StorageService storageService;
    private final JwtService jwtService;

    @Operation(summary = "Informations d'un fichier partagé",
            description = "Nom, type, taille, date d'expiration et protection par mot de passe, sans télécharger le fichier.")
    @ApiResponse(responseCode = "200", description = "Informations du fichier")
    @GetMapping("/{token}")
    public DownloadInfoDTO info(@Parameter(description = "Token du lien de partage") @PathVariable String token) {
        return DownloadInfoDTO.from(fileService.getDownloadable(token));
    }

    @Operation(summary = "Obtenir un ticket de téléchargement",
            description = "Vérifie le mot de passe si le fichier est protégé ; sinon, le corps peut être omis. "
                    + "Le ticket est valable 60 secondes, pour ce fichier uniquement.")
    @ApiResponse(responseCode = "200", description = "Ticket délivré")
    @ApiResponse(responseCode = "403", description = "Mot de passe absent ou incorrect",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @PostMapping("/{token}/ticket")
    public DownloadTicketDTO ticket(@Parameter(description = "Token du lien de partage") @PathVariable String token,
            @RequestBody(required = false) DownloadRequestDTO request) {
        StoredFile file = fileService.checkDownloadAccess(token, request == null ? null : request.password());
        return new DownloadTicketDTO(jwtService.generateDownloadTicket(file.getToken()));
    }

    @Operation(summary = "Télécharger le fichier",
            description = "Envoie le fichier en flux, en pièce jointe (Content-Disposition: attachment).")
    @ApiResponse(responseCode = "200", description = "Contenu du fichier",
            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "400", description = "Ticket manquant",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @ApiResponse(responseCode = "403", description = "Ticket invalide, expiré ou délivré pour un autre fichier",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @GetMapping("/{token}/file")
    public ResponseEntity<Resource> file(
            @Parameter(description = "Token du lien de partage") @PathVariable String token,
            @Parameter(description = "Ticket obtenu par POST /api/download/{token}/ticket") @RequestParam String ticket) {
        if (!jwtService.isDownloadTicketValid(ticket, token)) {
            throw new FileAccessDeniedException(
                    "Lien de téléchargement invalide ou expiré, recommencez depuis la page du fichier");
        }
        StoredFile file = fileService.getDownloadable(token);
        log.info("Téléchargement du fichier {} : {} octets", file.getId(), file.getSize());
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(file.getOriginalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.getSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(storageService.load(file.getStorageName()));
    }
}
