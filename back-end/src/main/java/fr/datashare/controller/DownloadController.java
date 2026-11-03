package fr.datashare.controller;

import fr.datashare.dto.DownloadInfoDTO;
import fr.datashare.dto.DownloadRequestDTO;
import fr.datashare.entities.StoredFile;
import fr.datashare.service.FileService;
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

    @GetMapping("/{token}")
    public DownloadInfoDTO info(@PathVariable String token) {
        return DownloadInfoDTO.from(fileService.getDownloadable(token));
    }

    @PostMapping("/{token}")
    public ResponseEntity<Resource> download(@PathVariable String token,
            @RequestBody(required = false) DownloadRequestDTO request) {
        StoredFile file = fileService.checkDownloadAccess(token, request == null ? null : request.password());
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