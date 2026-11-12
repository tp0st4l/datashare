package fr.datashare.controller;

import fr.datashare.dto.DownloadInfoDTO;
import fr.datashare.dto.DownloadRequestDTO;
import fr.datashare.dto.DownloadTicketDTO;
import fr.datashare.entities.StoredFile;
import fr.datashare.exception.FileAccessDeniedException;
import fr.datashare.service.FileService;
import fr.datashare.service.JwtService;
import fr.datashare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/download")
@RequiredArgsConstructor
public class DownloadController {

    private final FileService fileService;
    private final StorageService storageService;
    private final JwtService jwtService;

    @GetMapping("/{token}")
    public DownloadInfoDTO info(@PathVariable String token) {
        return DownloadInfoDTO.from(fileService.getDownloadable(token));
    }

    @PostMapping("/{token}/ticket")
    public DownloadTicketDTO ticket(@PathVariable String token,
            @RequestBody(required = false) DownloadRequestDTO request) {
        StoredFile file = fileService.checkDownloadAccess(token, request == null ? null : request.password());
        return new DownloadTicketDTO(jwtService.generateDownloadTicket(file.getToken()));
    }

    @GetMapping("/{token}/file")
    public ResponseEntity<Resource> file(@PathVariable String token, @RequestParam String ticket) {
        if (!jwtService.isDownloadTicketValid(ticket, token)) {
            throw new FileAccessDeniedException(
                    "Lien de téléchargement invalide ou expiré, recommencez depuis la page du fichier");
        }
        StoredFile file = fileService.getDownloadable(token);
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