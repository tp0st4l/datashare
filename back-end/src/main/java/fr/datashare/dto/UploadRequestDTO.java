package fr.datashare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.multipart.MultipartFile;

/** Champs du formulaire multipart de téléversement. */
public record UploadRequestDTO(
        @Schema(description = "Fichier à partager", requiredMode = Schema.RequiredMode.REQUIRED)
        MultipartFile file,

        @Schema(description = "Mot de passe facultatif, 6 caractères minimum")
        String password,

        @Schema(description = "Durée de conservation en jours, de 1 à 7 (7 par défaut)", minimum = "1", maximum = "7")
        Integer expirationDays) {
}
