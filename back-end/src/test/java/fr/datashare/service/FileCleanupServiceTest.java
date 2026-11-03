package fr.datashare.service;

import fr.datashare.entities.StoredFile;
import fr.datashare.repository.StoredFileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileCleanupServiceTest {

    @Mock
    private StoredFileRepository storedFileRepository;
    @Mock
    private StorageService storageService;

    @InjectMocks
    private FileCleanupService fileCleanupService;

    private StoredFile file(String storageName) {
        StoredFile file = new StoredFile();
        file.setStorageName(storageName);
        return file;
    }

    @Test
    void purge_deletesRowsAndFilesOfExpiredFiles() {
        when(storedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of(file("a"), file("b")));

        fileCleanupService.purgeExpiredFiles();

        verify(storedFileRepository, times(2)).delete(any(StoredFile.class));
        verify(storageService).delete("a");
        verify(storageService).delete("b");
    }

    @Test
    void purge_continuesWhenADiskDeletionFails() {
        when(storedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of(file("a"), file("b")));
        doThrow(new UncheckedIOException(new IOException("disque"))).when(storageService).delete("a");

        fileCleanupService.purgeExpiredFiles();

        verify(storageService).delete("b");
    }

    @Test
    void purge_doesNothingWhenNoFileIsExpired() {
        when(storedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of());

        fileCleanupService.purgeExpiredFiles();

        verify(storedFileRepository, never()).delete(any());
        verify(storageService, never()).delete(any());
    }
}