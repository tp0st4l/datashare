package fr.datashare.dto;

import fr.datashare.entities.StoredFile;

import java.time.LocalDateTime;

public record FileResponseDTO(
        Long id,
        String token,
        String originalName,
        String contentType,
        long size,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        boolean passwordProtected,
        boolean expired) {

    public static FileResponseDTO from(StoredFile file) {
        return new FileResponseDTO(
                file.getId(),
                file.getToken(),
                file.getOriginalName(),
                file.getContentType(),
                file.getSize(),
                file.getCreatedAt(),
                file.getExpiresAt(),
                file.isPasswordProtected(),
                file.isExpired());
    }
}