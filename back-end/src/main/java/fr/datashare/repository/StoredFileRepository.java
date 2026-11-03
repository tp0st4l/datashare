package fr.datashare.repository;

import fr.datashare.entities.StoredFile;
import fr.datashare.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

    Optional<StoredFile> findByToken(String token);

    List<StoredFile> findByOwnerOrderByCreatedAtDesc(User owner);

    List<StoredFile> findByExpiresAtBefore(LocalDateTime date);
}