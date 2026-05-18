package com.zeyvo.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Sends OTP SMS via Eskiz.uz.
 * Docs: https://documenter.getpostman.com/view/663428/2s93JtQPEM
 *
 * Token auto-refreshes — Eskiz tokens expire in ~30 days.
 * In prod, also cache token in Redis with TTL to survive restarts.
 */
@Service
@Slf4j
public class EskizSmsService {

    private static final String BASE_URL = "https://notify.eskiz.uz/api";
    private static final String FROM = "4546"; // Eskiz sender ID for OTP

    private final String email;
    private final String password;
    private final RestClient http;

    // Cached bearer token — refreshed on 401
    private final AtomicReference<String> cachedToken = new AtomicReference<>();

    public EskizSmsService(
            @Value("${zeyvo.eskiz.email:}") String email,
            @Value("${zeyvo.eskiz.password:}") String password
    ) {
        this.email = email;
        this.password = password;
        this.http = RestClient.builder().baseUrl(BASE_URL).build();
    }

    public void sendOtp(String phone, String code) {
        if (email.isBlank() || password.isBlank()) {
            // Dev mode: just log the OTP
            log.warn("[DEV] OTP for {}: {}", phone, code);
            return;
        }

        String token = token();
        String message = "zeyvo tasdiqlash kodi: " + code + ". Hech kimga bermang.";

        try {
            doSend(phone, message, token);
        } catch (Exception e) {
            // Retry once with refreshed token (handles expired token)
            log.warn("Eskiz send failed, refreshing token and retrying: {}", e.getMessage());
            cachedToken.set(null);
            doSend(phone, message, token());
        }
    }

    @SuppressWarnings("unchecked")
    private String token() {
        String cached = cachedToken.get();
        if (cached != null) return cached;

        Map<String, Object> resp = http.post()
                .uri("/auth/login")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(Map.of("email", email, "password", password))
                .retrieve()
                .body(Map.class);

        String token = (String) ((Map<?, ?>) resp.get("data")).get("token");
        cachedToken.set(token);
        return token;
    }

    @SuppressWarnings("unchecked")
    private void doSend(String phone, String message, String token) {
        // Eskiz expects phone without leading +, e.g. 998901234567
        String normalizedPhone = phone.replaceAll("[^0-9]", "");

        Map<String, Object> resp = http.post()
                .uri("/message/sms/send")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(Map.of(
                        "mobile_phone", normalizedPhone,
                        "message", message,
                        "from", FROM
                ))
                .retrieve()
                .body(Map.class);

        String status = (String) resp.get("status");
        if (!"waiting".equals(status) && !"sent".equals(status)) {
            throw new RuntimeException("Eskiz returned unexpected status: " + status);
        }
        log.debug("OTP SMS queued for {}", phone);
    }
}
