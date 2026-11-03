package fr.datashare.service;

import fr.datashare.entities.StoredFile;
import fr.datashare.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileCleanupService {

    private final StoredFileRepository storedFileRepository;
    private final StorageService storageService;

    @Scheduled(cron = "${app.cleanup.cron}")
    @Transactional
    public void purgeExpiredFiles() {
        List<StoredFile> expiredFiles = storedFileRepository.findByExpiresAtBefore(LocalDateTime.now());
        for (StoredFile file : expiredFiles) {
            storedFileRepository.delete(file);
            try {
                storageService.delete(file.getStorageName());
            } catch (UncheckedIOException e) {
                log.warn("Fichier {} introuvable ou non supprimable sur le disque", file.getStorageName(), e);
            }
        }
        log.info("Purge des fichiers expirés : {} fichier(s) supprimé(s)", expiredFiles.size());
    }
}