package fr.datashare.controller;

import com.jayway.jsonpath.JsonPath;
import fr.datashare.TestcontainersConfiguration;
import fr.datashare.entities.User;
import fr.datashare.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AuthControllerTest {

    private static final String EMAIL = "test@datashare.fr";
    private static final String PASSWORD = "motdepasse";

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @AfterEach
    void cleanDatabase() {
        userRepository.deleteAll();
    }

    // ---------- Outils ----------

    private ResultActions register(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    // ---------- Inscription ----------

    @Test
    void register_returns201AndStoresHashedPassword() throws Exception {
        register(EMAIL, PASSWORD).andExpect(status().isCreated());

        User saved = userRepository.findByEmail(EMAIL).orElseThrow();
        assertNotEquals(PASSWORD, saved.getPassword());
        assertTrue(saved.getPassword().startsWith("$2a$"));
    }

    @Test
    void register_returns409WhenEmailAlreadyUsed() throws Exception {
        register(EMAIL, PASSWORD);

        register(EMAIL, PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Un compte existe déjà avec cet email"));
    }

    @Test
    void register_returns400WhenEmailIsInvalid() throws Exception {
        register("pasunemail", PASSWORD).andExpect(status().isBadRequest());
    }

    @Test
    void register_returns400WhenPasswordIsTooShort() throws Exception {
        register(EMAIL, "court").andExpect(status().isBadRequest());
    }

    // ---------- Connexion ----------

    @Test
    void login_returns200WithToken() throws Exception {
        register(EMAIL, PASSWORD);

        login(EMAIL, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void login_returns401WhenPasswordIsWrong() throws Exception {
        register(EMAIL, PASSWORD);

        login(EMAIL, "mauvais123").andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns401WhenEmailIsUnknown() throws Exception {
        login("inconnu@datashare.fr", PASSWORD).andExpect(status().isUnauthorized());
    }

    // ---------- Route protégée ----------

    @Test
    void me_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void me_returns401WithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer abc.def.ghi"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_returns200WithValidToken() throws Exception {
        register(EMAIL, PASSWORD);
        String response = login(EMAIL, PASSWORD).andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(response, "$.accessToken");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL));
    }
}