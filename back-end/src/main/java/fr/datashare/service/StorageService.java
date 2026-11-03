package fr.datashare.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.storage.location}") String location) throws IOException {
        this.root = Paths.get(location).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(MultipartFile file) {
        String storageName = UUID.randomUUID().toString();
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(storageName));
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible d'enregistrer le fichier", e);
        }
        return storageName;
    }

    public void delete(String storageName) {
        try {
            Files.deleteIfExists(root.resolve(storageName));
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible de supprimer le fichier", e);
        }
    }
}