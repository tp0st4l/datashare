package fr.datashare.dto;

import fr.datashare.entities.StoredFile;

import java.time.LocalDateTime;

public record DownloadInfoDTO(String originalName, String contentType, long size,
        LocalDateTime expiresAt, boolean passwordProtected) {

    public static DownloadInfoDTO from(StoredFile file) {
        return new DownloadInfoDTO(file.getOriginalName(), file.getContentType(), file.getSize(),
                file.getExpiresAt(), file.isPasswordProtected());
    }
}