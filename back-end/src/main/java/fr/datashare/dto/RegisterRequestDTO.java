package fr.datashare.dto;

import fr.datashare.validation.BcryptCompatible;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequestDTO {
    @NotBlank(message = "L'email est obligatoire")
    @Email(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Le format de l'email est invalide")
    private String email;

    @Schema(description = "8 caractères minimum, 72 octets maximum (limite de BCrypt)")
    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    @BcryptCompatible
    private String password;
}