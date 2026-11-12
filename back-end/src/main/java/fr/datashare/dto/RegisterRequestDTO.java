package fr.datashare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequestDTO {
    @NotBlank
    @Email(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    private String email;

    @NotBlank
    @Size(min = 8)
    private String password;
}