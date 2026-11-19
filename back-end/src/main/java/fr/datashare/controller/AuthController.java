package fr.datashare.controller;

import fr.datashare.dto.LoginRequestDTO;
import fr.datashare.dto.LoginResponseDTO;
import fr.datashare.dto.MeResponseDTO;
import fr.datashare.dto.RegisterRequestDTO;
import fr.datashare.entities.User;
import fr.datashare.handler.ErrorDetails;
import fr.datashare.mapper.UserDtoMapper;
import fr.datashare.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Authentification", description = "Création de compte et connexion")
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final UserDtoMapper userDtoMapper;

    @Operation(summary = "Créer un compte",
            description = "Email unique au format valide, mot de passe de 8 caractères minimum (hashé avec BCrypt).")
    @ApiResponse(responseCode = "201", description = "Compte créé")
    @ApiResponse(responseCode = "400", description = "Données invalides : le détail par champ est dans fieldErrors",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @ApiResponse(responseCode = "409", description = "Un compte existe déjà avec cet email",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequestDTO registerRequestDTO) {
        userService.register(userDtoMapper.toEntity(registerRequestDTO));
    }

    @Operation(summary = "Se connecter",
            description = "Renvoie un JWT valable 1 heure, à envoyer dans l'en-tête Authorization, précédé de « Bearer ».")
    @ApiResponse(responseCode = "200", description = "Connexion réussie")
    @ApiResponse(responseCode = "400", description = "Données invalides : le détail par champ est dans fieldErrors",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @ApiResponse(responseCode = "401", description = "Email ou mot de passe incorrect",
            content = @Content(schema = @Schema(implementation = ErrorDetails.class)))
    @PostMapping("/login")
    public LoginResponseDTO login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {
        String token = userService.login(loginRequestDTO.getEmail(), loginRequestDTO.getPassword());
        return new LoginResponseDTO(token);
    }

    @Operation(summary = "Utilisateur connecté", description = "Renvoie l'email du titulaire du token.")
    @ApiResponse(responseCode = "200", description = "Utilisateur connecté")
    @ApiResponse(responseCode = "401", description = "Token absent, invalide ou expiré", content = @Content)
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public MeResponseDTO me(@AuthenticationPrincipal User user) {
        return new MeResponseDTO(user.getEmail());
    }
}
