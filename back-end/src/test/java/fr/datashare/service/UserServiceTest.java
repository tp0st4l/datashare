package fr.datashare.service;

import fr.datashare.entities.User;
import fr.datashare.exception.EmailAlreadyUsedException;
import fr.datashare.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String EMAIL = "test@datashare.fr";
    private static final String PASSWORD = "motdepasse";
    private static final String HASH = "hash-bcrypt";

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private UserService userService;

    private User newUser(String password) {
        User user = new User();
        user.setEmail(EMAIL);
        user.setPassword(password);
        return user;
    }

    @Test
    void register_hashesPasswordAndSavesUser() {
        // GIVEN
        User user = newUser(PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(PASSWORD)).thenReturn(HASH);

        // WHEN
        userService.register(user);

        // THEN
        assertEquals(HASH, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void register_throwsWhenEmailAlreadyUsed() {
        // GIVEN
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(newUser(HASH)));

        // WHEN + THEN
        assertThrows(EmailAlreadyUsedException.class, () -> userService.register(newUser(PASSWORD)));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_returnsTokenWhenCredentialsAreValid() {
        // GIVEN
        User user = newUser(HASH);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, HASH)).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token");

        // WHEN
        String token = userService.login(EMAIL, PASSWORD);

        // THEN
        assertEquals("jwt-token", token);
    }

    @Test
    void login_throwsWhenPasswordIsWrong() {
        // GIVEN
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(newUser(HASH)));
        when(passwordEncoder.matches("mauvais", HASH)).thenReturn(false);

        // WHEN + THEN
        assertThrows(BadCredentialsException.class, () -> userService.login(EMAIL, "mauvais"));
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void login_throwsWhenEmailIsUnknown() {
        // GIVEN
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        // WHEN + THEN
        assertThrows(BadCredentialsException.class, () -> userService.login(EMAIL, PASSWORD));
    }
}