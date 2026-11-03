package fr.datashare.controller;

import fr.datashare.dto.LoginRequestDTO;
import fr.datashare.dto.LoginResponseDTO;
import fr.datashare.dto.RegisterRequestDTO;
import fr.datashare.mapper.UserDtoMapper;
import fr.datashare.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final UserDtoMapper userDtoMapper;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequestDTO registerRequestDTO) {
        userService.register(userDtoMapper.toEntity(registerRequestDTO));
    }

    @PostMapping("/login")
    public LoginResponseDTO login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {
        String token = userService.login(loginRequestDTO.getEmail(), loginRequestDTO.getPassword());
        return new LoginResponseDTO(token);
    }
}