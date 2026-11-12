package fr.datashare.controller;

import com.jayway.jsonpath.JsonPath;
import fr.datashare.TestcontainersConfiguration;
import fr.datashare.entities.StoredFile;
import fr.datashare.repository.StoredFileRepository;
import fr.datashare.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.storage.location=target/test-uploads")
@Import(TestcontainersConfiguration.class)
class FileControllerTest {

    private static final String FILE_PASSWORD = "secret12";

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private StoredFileRepository storedFileRepository;

    private MockMvc mockMvc;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        token = createUserAndLogin("owner@datashare.fr");
    }

    @AfterEach
    void cleanDatabase() {
        storedFileRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ---------- Outils ----------

    private String createUserAndLogin(String email) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"motdepasse\"}";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body));
        String response = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.accessToken");
    }

    private MockMultipartFile textFile(String name) {
        return new MockMultipartFile("file", name, "text/plain", "Bonjour DataShare".getBytes());
    }

    private String upload(String password) throws Exception {
        var request = multipart("/api/files").file(textFile("test.txt")).header("Authorization", "Bearer " + token);
        if (password != null) {
            request.param("password", password);
        }
        String response = mockMvc.perform(request).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.token");
    }

    private void expireAllFiles() {
        List<StoredFile> files = storedFileRepository.findAll();
        files.forEach(file -> file.setExpiresAt(LocalDateTime.now().minusDays(1)));
        storedFileRepository.saveAll(files);
    }

    private org.springframework.test.web.servlet.ResultActions requestTicket(String fileToken, String password)
            throws Exception {
        var request = post("/api/download/" + fileToken + "/ticket");
        if (password != null) {
            request.contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"" + password + "\"}");
        }
        return mockMvc.perform(request);
    }

    // ---------- Upload ----------

    @Test
    void upload_returns201() throws Exception {
        mockMvc.perform(multipart("/api/files").file(textFile("test.txt")).header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.originalName").value("test.txt"))
                .andExpect(jsonPath("$.passwordProtected").value(false));
    }

    @Test
    void upload_returns400ForForbiddenExtension() throws Exception {
        mockMvc.perform(multipart("/api/files").file(textFile("virus.exe")).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returns400ForShortPassword() throws Exception {
        mockMvc.perform(multipart("/api/files").file(textFile("test.txt")).param("password", "abc")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returns400ForInvalidExpiration() throws Exception {
        mockMvc.perform(multipart("/api/files").file(textFile("test.txt")).param("expirationDays", "10")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returns401WithoutToken() throws Exception {
        mockMvc.perform(multipart("/api/files").file(textFile("test.txt")))
                .andExpect(status().isUnauthorized());
    }

    // ---------- Mes fichiers ----------

    @Test
    void myFiles_returnsOnlyOwnFiles() throws Exception {
        upload(null);
        String otherToken = createUserAndLogin("autre@datashare.fr");

        mockMvc.perform(get("/api/files").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void myFiles_hidesExpiredFilesByDefault() throws Exception {
        upload(null);
        expireAllFiles();

        mockMvc.perform(get("/api/files").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/files").param("includeExpired", "true").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].expired").value(true));
    }

    // ---------- Suppression ----------

    @Test
    void delete_returns204ForOwner() throws Exception {
        upload(null);
        Long id = storedFileRepository.findAll().getFirst().getId();

        mockMvc.perform(delete("/api/files/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertEquals(0, storedFileRepository.count());
    }

    @Test
    void delete_returns404ForAnotherUser() throws Exception {
        upload(null);
        Long id = storedFileRepository.findAll().getFirst().getId();
        String otherToken = createUserAndLogin("autre@datashare.fr");

        mockMvc.perform(delete("/api/files/" + id).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
        assertEquals(1, storedFileRepository.count());
    }

    // ---------- Téléchargement ----------

    @Test
    void downloadInfo_returns200() throws Exception {
        String fileToken = upload(FILE_PASSWORD);

        mockMvc.perform(get("/api/download/" + fileToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalName").value("test.txt"))
                .andExpect(jsonPath("$.passwordProtected").value(true));
    }

    @Test
    void ticket_returns403WithoutPassword() throws Exception {
        requestTicket(upload(FILE_PASSWORD), null).andExpect(status().isForbidden());
    }

    @Test
    void ticket_returns403WithWrongPassword() throws Exception {
        requestTicket(upload(FILE_PASSWORD), "mauvais").andExpect(status().isForbidden());
    }

    @Test
    void download_returnsFileWithValidTicket() throws Exception {
        String fileToken = upload(FILE_PASSWORD);
        String response = requestTicket(fileToken, FILE_PASSWORD).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String ticket = JsonPath.read(response, "$.ticket");

        mockMvc.perform(get("/api/download/" + fileToken + "/file").param("ticket", ticket))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andExpect(content().string("Bonjour DataShare"));
    }

    @Test
    void download_returns403WithInvalidTicket() throws Exception {
        String fileToken = upload(null);

        mockMvc.perform(get("/api/download/" + fileToken + "/file").param("ticket", "abc.def.ghi"))
                .andExpect(status().isForbidden());
    }

    @Test
    void download_returns403WithTicketOfAnotherFile() throws Exception {
        String firstToken = upload(null);
        String secondToken = upload(null);
        String response = requestTicket(firstToken, null).andReturn().getResponse().getContentAsString();
        String ticket = JsonPath.read(response, "$.ticket");

        mockMvc.perform(get("/api/download/" + secondToken + "/file").param("ticket", ticket))
                .andExpect(status().isForbidden());
    }

    @Test
    void download_returns404ForUnknownLink() throws Exception {
        mockMvc.perform(get("/api/download/lieninexistant"))
                .andExpect(status().isNotFound());
    }

    @Test
    void download_returns410ForExpiredLink() throws Exception {
        String fileToken = upload(null);
        expireAllFiles();

        mockMvc.perform(get("/api/download/" + fileToken))
                .andExpect(status().isGone());
    }
}