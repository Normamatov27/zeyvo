package com.zeyvo.auth.service;

import com.zeyvo.common.web.DomainException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sends OTP SMS via DevSMS.
 *
 * API docs: https://devsms.uz/api/docs.php
 */
@Service
@Slf4j
public class DevSmsService {

    private final String baseUrl;
    private final String apiKey;
    private final String serviceName;
    private final int templateType;
    private final RestClient http;

    public DevSmsService(
            @Value("${zeyvo.sms.base-url:https://devsms.uz/api}") String baseUrl,
            @Value("${zeyvo.sms.api-key:}") String apiKey,
            @Value("${zeyvo.sms.service-name:Zeyvo}") String serviceName,
            @Value("${zeyvo.sms.template-type:4}") int templateType
    ) {
        this.baseUrl = stripTrailingSlash(baseUrl);
        this.apiKey = apiKey;
        this.serviceName = serviceName;
        this.templateType = templateType;
        this.http = RestClient.create();
    }

    public void sendOtp(String phone, String code) {
        if (apiKey.isBlank()) {
            log.warn("[DEV] OTP for {}: {}", phone, code);
            return;
        }
        doSend(phone, code);
    }

    public void sendText(String phone, String text) {
        if (apiKey.isBlank()) {
            log.info("[DEV] SMS to {}: {}", phone, text);
            return;
        }
        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("phone", normalizedPhone);
        payload.put("type", "notification");
        payload.put("message", text);
        try {
            http.post()
                    .uri(baseUrl + "/send_sms.php")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("SMS send failed for {}: {}", normalizedPhone, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void doSend(String phone, String code) {
        String normalizedPhone = phone.replaceAll("[^0-9]", "");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("phone", normalizedPhone);
        payload.put("type", "universal_otp");
        payload.put("template_type", templateType);
        payload.put("service_name", serviceName);
        payload.put("otp_code", code);

        Map<String, Object> resp;
        try {
            resp = http.post()
                    .uri(baseUrl + "/send_sms.php")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException e) {
            log.warn("DevSMS rejected OTP SMS for {}: HTTP {}", phone, e.getStatusCode().value());
            throw new DomainException(
                    "sms.provider_error",
                    "SMS provider rejected the OTP request.",
                    HttpStatus.BAD_GATEWAY
            );
        }

        if (resp == null || !Boolean.TRUE.equals(resp.get("success"))) {
            log.warn("DevSMS returned unsuccessful OTP response for {}", phone);
            throw new DomainException(
                    "sms.provider_error",
                    "SMS provider rejected the OTP request.",
                    HttpStatus.BAD_GATEWAY
            );
        }

        Object data = resp.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            log.debug("OTP SMS queued for {} with status {}", phone, dataMap.get("status"));
        } else {
            log.debug("OTP SMS queued for {}", phone);
        }
    }

    private static String stripTrailingSlash(String value) {
        String trimmed = value == null ? "" : value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed.isBlank() ? "https://devsms.uz/api" : trimmed;
    }
}
