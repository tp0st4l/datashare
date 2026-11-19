package fr.datashare.handler;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class RestExceptionHandlerTest {

    @Test
    void unexpectedError_returns500WithoutExposingInternalDetails() {
        var request = new ServletWebRequest(new MockHttpServletRequest("GET", "/api/files"));

        ResponseEntity<ErrorDetails> response = new RestExceptionHandler()
                .handleUnexpected(new IllegalStateException("détail interne secret"), request);

        assertEquals(500, response.getStatusCode().value());
        assertEquals("Une erreur interne est survenue, réessayez plus tard", response.getBody().message());
        assertFalse(response.getBody().message().contains("secret"));
        assertEquals("uri=/api/files", response.getBody().details());
    }
}
