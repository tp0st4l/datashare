package fr.datashare.configuration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class RequestMetricsFilterTest {

    private final RequestMetricsFilter filter = new RequestMetricsFilter();

    @Test
    void logsMethodRouteStatusAndDuration(CapturedOutput output) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(201);

        filter.doFilter(new MockHttpServletRequest("POST", "/api/files"), response, new MockFilterChain());

        assertThat(output).containsPattern("POST /api/files 201 \\d+ ms");
    }

    @Test
    void masksShareTokenAndNeverLogsTheTicket(CapturedOutput output) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/download/jetonSecret123/file");
        request.setQueryString("ticket=ticketSecret456");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(output).contains("GET /api/download/{token}/file 200")
                .doesNotContain("jetonSecret123")
                .doesNotContain("ticketSecret456");
    }

    @Test
    void ignoresRoutesOutsideTheApi(CapturedOutput output) throws Exception {
        filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health"), new MockHttpServletResponse(),
                new MockFilterChain());

        assertThat(output).doesNotContain("/actuator/health");
    }
}
