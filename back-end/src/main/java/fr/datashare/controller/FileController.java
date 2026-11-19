package fr.datashare.controller;

import fr.datashare.dto.FileResponseDTO;
import fr.datashare.dto.UploadRequestDTO;
import fr.datashare.entities.User;
import fr.datashare.handler.ErrorDetails;
import fr.datashare.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Fichiers", description = "Gestion des fichiers de l'utilisateur connecté")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré", content = @Content)
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Operation(summary = "Téléverser un fichier",
            description = "1 Go maximum, extensions exécutables refusées. Renvoie le token du lien de partage.")
    @ApiResponse(responseCode = "201", description = "Fichier enregistré")
    @ApiResponse(responseCode = "400",
            description = "Fichier refusé : vide, extension interdite, mot de passe ou durée invalides",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @ApiResponse(responseCode = "413", description = "Fichier trop volumineux : 1 Go maximum",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FileResponseDTO upload(@ModelAttribute UploadRequestDTO request, @AuthenticationPrincipal User user) {
        return FileResponseDTO.from(fileService.upload(request.file(), request.password(), request.expirationDays(), user));
    }

    @Operation(summary = "Lister ses fichiers", description = "Du plus récent au plus ancien.")
    @ApiResponse(responseCode = "200", description = "Liste des fichiers de l'utilisateur")
    @GetMapping
    public List<FileResponseDTO> myFiles(
            @Parameter(description = "Inclure les fichiers expirés")
            @RequestParam(defaultValue = "false") boolean includeExpired,
            @AuthenticationPrincipal User user) {
        return fileService.listFiles(user, includeExpired).stream()
                .map(FileResponseDTO::from)
                .toList();
    }

    @Operation(summary = "Supprimer un fichier", description = "Supprime le fichier sur le disque et ses métadonnées.")
    @ApiResponse(responseCode = "204", description = "Fichier supprimé")
    @ApiResponse(responseCode = "404", description = "Fichier inconnu ou appartenant à un autre utilisateur",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        fileService.delete(id, user);
    }
}