package fr.datashare.controller;

import fr.datashare.dto.FileResponseDTO;
import fr.datashare.entities.User;
import fr.datashare.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FileResponseDTO upload(@RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String password,
            @RequestParam(required = false) Integer expirationDays,
            @AuthenticationPrincipal User user) {
        return FileResponseDTO.from(fileService.upload(file, password, expirationDays, user));
    }
}