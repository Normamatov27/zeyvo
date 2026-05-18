package com.zeyvo.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zeyvo.auth.service.TelegramAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.*;

class TelegramAuthServiceTest {

    private static final String BOT_TOKEN = "123456:AAABBBCCCDDDEEE";

    private final TelegramAuthService service = buildService();

    private TelegramAuthService buildService() {
        TelegramAuthService svc = new TelegramAuthService(new ObjectMapper());
        ReflectionTestUtils.setField(svc, "botToken", BOT_TOKEN);
        return svc;
    }

    @Test
    void validates_correct_initData() throws Exception {
        String userJson = """
                {"id":123456789,"first_name":"Sardor","last_name":"K","username":"sardor_k","language_code":"uz"}""";

        // data_check_string uses decoded values (per Telegram spec + reference implementations)
        Map<String, String> decodedParams = new TreeMap<>();
        decodedParams.put("user", userJson);
        decodedParams.put("auth_date", String.valueOf(System.currentTimeMillis() / 1000));

        String dataCheckString = decodedParams.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + "\n" + b)
                .orElseThrow();

        byte[] secretKey = hmac("WebAppData".getBytes(StandardCharsets.UTF_8), BOT_TOKEN.getBytes(StandardCharsets.UTF_8));
        byte[] hash = hmac(dataCheckString.getBytes(StandardCharsets.UTF_8), secretKey);
        String hexHash = toHex(hash);

        // Build initData as a URL query string with URL-encoded user value
        String initData = "auth_date=" + decodedParams.get("auth_date")
                + "&hash=" + hexHash
                + "&user=" + URLEncoder.encode(userJson, StandardCharsets.UTF_8);

        Map<String, Object> user = service.validateAndExtractUser(initData);

        assertThat(user.get("id")).isEqualTo(123456789);
        assertThat(user.get("first_name")).isEqualTo("Sardor");
    }

    @Test
    void rejects_tampered_initData() {
        String fakeInitData = "user=%7B%22id%22%3A999%7D&auth_date=1234567890&hash=badhash";
        assertThatThrownBy(() -> service.validateAndExtractUser(fakeInitData))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("HMAC");
    }

    @Test
    void rejects_missing_hash() {
        assertThatThrownBy(() -> service.validateAndExtractUser("user=something&auth_date=123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hash");
    }

    private byte[] hmac(byte[] data, byte[] key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
