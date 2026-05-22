package com.zeyvo.auth.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramAuthService {

    @Value("${zeyvo.telegram.bot-token}")
    private String botToken;

    private final ObjectMapper objectMapper;

    /**
     * Validates Telegram WebApp initData and extracts the user object.
     *
     * @param initData raw initData string from Telegram.WebApp.initData
     * @return parsed user map (id, first_name, username, etc.)
     * @throws IllegalArgumentException if validation fails
     */
    public Map<String, Object> validateAndExtractUser(String initData) {
        Map<String, String> params = parseQuery(initData);

        String receivedHash = params.remove("hash");
        if (receivedHash == null) {
            log.warn("[tg-auth] missing hash in initData (len={})", initData == null ? 0 : initData.length());
            throw new IllegalArgumentException("Missing hash in initData");
        }

        // Build data_check_string: sorted key=value pairs joined by \n
        String dataCheckString = params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + "\n" + b)
                .orElseThrow(() -> new IllegalArgumentException("Empty initData"));

        // secret_key = HMAC-SHA256("WebAppData", bot_token)
        byte[] secretKey = hmacSha256("WebAppData".getBytes(StandardCharsets.UTF_8),
                botToken.getBytes(StandardCharsets.UTF_8));

        // expected_hash = HMAC-SHA256(data_check_string, secret_key)
        byte[] expectedHashBytes = hmacSha256(dataCheckString.getBytes(StandardCharsets.UTF_8), secretKey);
        String expectedHash = toHex(expectedHashBytes);

        if (!constantTimeEquals(expectedHash, receivedHash)) {
            // Fallback: some clients send '+' (form-encoded space) inside values that we
            // must NOT collapse to space when building the data_check_string. Try a
            // raw-values variant where we keep the wire bytes between '&' separators
            // as-is. If that matches, accept it.
            String rawDataCheckString = buildRawDataCheckString(initData);
            byte[] rawHashBytes = hmacSha256(rawDataCheckString.getBytes(StandardCharsets.UTF_8), secretKey);
            String rawHash = toHex(rawHashBytes);
            if (constantTimeEquals(rawHash, receivedHash)) {
                log.info("[tg-auth] HMAC matched on raw-values fallback");
            } else {
                // Diagnose: log lengths + first/last 6 chars of hashes + sorted keys present
                log.warn("[tg-auth] HMAC mismatch. tokenLen={}, initDataLen={}, keys={}, decodedHash={}…{}, rawHash={}…{}, recv={}…{}",
                        botToken.length(), initData.length(), params.keySet(),
                        head(expectedHash), tail(expectedHash),
                        head(rawHash), tail(rawHash),
                        head(receivedHash), tail(receivedHash));
                throw new IllegalArgumentException("initData HMAC validation failed");
            }
        }

        // Reject initData older than 5 minutes (prevents replay attacks)
        String authDateStr = params.get("auth_date");
        if (authDateStr != null) {
            long authDate = Long.parseLong(authDateStr);
            long nowEpoch = System.currentTimeMillis() / 1000L;
            if (nowEpoch - authDate > 300) {
                throw new IllegalArgumentException("initData has expired (auth_date too old)");
            }
        }

        // Parse user JSON from initData
        String userJson = params.get("user");
        if (userJson == null) {
            throw new IllegalArgumentException("No user in initData");
        }

        try {
            return objectMapper.readValue(
                    URLDecoder.decode(userJson, StandardCharsets.UTF_8),
                    new TypeReference<>() {}
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse Telegram user: " + e.getMessage());
        }
    }

    /**
     * Validates Telegram Login Widget callback data.
     * Widget sends: id, first_name, last_name, username, photo_url, auth_date, hash
     * secret_key = SHA-256(bot_token); hash = HMAC-SHA256(data_check_string, secret_key)
     *
     * @param data map of fields sent by the widget (including "hash")
     * @return the validated user data (same map, hash removed)
     */
    public Map<String, String> validateWidgetData(Map<String, String> data) {
        Map<String, String> fields = new LinkedHashMap<>(data);
        String receivedHash = fields.remove("hash");
        if (receivedHash == null) throw new IllegalArgumentException("Missing hash");

        // auth_date must be within 1 day
        String authDateStr = fields.get("auth_date");
        if (authDateStr == null) throw new IllegalArgumentException("Missing auth_date");
        long authDate = Long.parseLong(authDateStr);
        long nowEpoch = System.currentTimeMillis() / 1000L;
        if (nowEpoch - authDate > 86400) throw new IllegalArgumentException("Auth data expired");

        String dataCheckString = fields.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + "\n" + b)
                .orElseThrow(() -> new IllegalArgumentException("Empty widget data"));

        // secret_key = SHA-256(bot_token)
        byte[] secretKey = sha256(botToken.getBytes(StandardCharsets.UTF_8));
        byte[] expectedBytes = hmacSha256(dataCheckString.getBytes(StandardCharsets.UTF_8), secretKey);
        String expectedHash = toHex(expectedBytes);

        if (!constantTimeEquals(expectedHash, receivedHash)) {
            throw new IllegalArgumentException("Widget HMAC validation failed");
        }

        return fields;
    }

    private byte[] sha256(byte[] data) {
        try {
            return java.security.MessageDigest.getInstance("SHA-256").digest(data);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }

    /** Build data_check_string from raw initData without URL-decoding values — fallback for clients that don't form-encode. */
    private String buildRawDataCheckString(String initData) {
        List<String> pairs = new ArrayList<>();
        for (String pair : initData.split("&")) {
            int eq = pair.indexOf('=');
            if (eq <= 0) continue;
            String key = pair.substring(0, eq);
            // Telegram requires key to be decoded; values stay raw
            String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
            if ("hash".equals(decodedKey)) continue;
            String rawValue = pair.substring(eq + 1);
            pairs.add(decodedKey + "=" + rawValue);
        }
        Collections.sort(pairs);
        return String.join("\n", pairs);
    }

    private static String head(String s) { return s == null ? "" : s.substring(0, Math.min(6, s.length())); }
    private static String tail(String s) { return s == null || s.length() < 6 ? "" : s.substring(s.length() - 6); }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> params = new LinkedHashMap<>();
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                String key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
                String val = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                params.put(key, val);
            }
        }
        return params;
    }

    private byte[] hmacSha256(byte[] data, byte[] key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 failed", e);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
