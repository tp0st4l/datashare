package fr.datashare.service;

import fr.datashare.entities.StoredFile;
import fr.datashare.entities.User;
import fr.datashare.exception.FileAccessDeniedException;
import fr.datashare.exception.FileExpiredException;
import fr.datashare.exception.InvalidFileException;
import fr.datashare.exception.ResourceNotFoundException;
import fr.datashare.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class FileService {

    private static final Set<String> FORBIDDEN_EXTENSIONS = Set.of("exe", "bat", "cmd", "com", "msi", "scr", "sh",
            "ps1", "vbs", "jar");
    private static final int DEFAULT_EXPIRATION_DAYS = 7;
    private static final int MIN_EXPIRATION_DAYS = 1;
    private static final int MAX_EXPIRATION_DAYS = 7;
    private static final int MIN_PASSWORD_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StoredFileRepository storedFileRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    public StoredFile upload(MultipartFile file, String password, Integer expirationDays, User owner) {
        validate(file, password, expirationDays);

        StoredFile storedFile = new StoredFile();
        storedFile.setToken(generateToken());
        storedFile.setOriginalName(file.getOriginalFilename());
        storedFile.setContentType(file.getContentType());
        storedFile.setSize(file.getSize());
        storedFile.setPasswordHash(hasPassword(password) ? passwordEncoder.encode(password) : null);
        int days = expirationDays == null ? DEFAULT_EXPIRATION_DAYS : expirationDays;
        storedFile.setExpiresAt(LocalDateTime.now().plusDays(days));
        storedFile.setOwner(owner);
        storedFile.setStorageName(storageService.store(file));

        return storedFileRepository.save(storedFile);
    }

    @Transactional(readOnly = true)
    public List<StoredFile> listFiles(User owner, boolean includeExpired) {
        return storedFileRepository.findByOwnerOrderByCreatedAtDesc(owner).stream()
                .filter(file -> includeExpired || !file.isExpired())
                .toList();
    }

    public void delete(Long id, User owner) {
        StoredFile file = storedFileRepository.findById(id)
                .filter(f -> f.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable"));
        storedFileRepository.delete(file);
        storageService.delete(file.getStorageName());
    }

    @Transactional(readOnly = true)
    public StoredFile getDownloadable(String token) {
        StoredFile file = storedFileRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Lien invalide"));
        if (file.isExpired()) {
            throw new FileExpiredException();
        }
        return file;
    }

    @Transactional(readOnly = true)
    public StoredFile checkDownloadAccess(String token, String password) {
        StoredFile file = getDownloadable(token);
        if (file.isPasswordProtected()
                && (password == null || !passwordEncoder.matches(password, file.getPasswordHash()))) {
            throw new FileAccessDeniedException();
        }
        return file;
    }

    private void validate(MultipartFile file, String password, Integer expirationDays) {
        if (file == null) {
            throw new InvalidFileException("Aucun fichier reçu");
        }
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank()) {
            throw new InvalidFileException("Le nom du fichier est manquant");
        }
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (FORBIDDEN_EXTENSIONS.contains(extension)) {
            throw new InvalidFileException("Ce type de fichier n'est pas autorisé");
        }
        if (file.isEmpty()) {
            throw new InvalidFileException("Le fichier est vide");
        }
        if (hasPassword(password) && password.length() < MIN_PASSWORD_LENGTH) {
            throw new InvalidFileException("Le mot de passe doit contenir au moins 6 caractères");
        }
        if (expirationDays != null && (expirationDays < MIN_EXPIRATION_DAYS || expirationDays > MAX_EXPIRATION_DAYS)) {
            throw new InvalidFileException("La durée d'expiration doit être comprise entre 1 et 7 jours");
        }
    }

    private boolean hasPassword(String password) {
        return password != null && !password.isBlank();
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

}