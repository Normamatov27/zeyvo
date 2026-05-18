package com.zeyvo.auth;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class JwtServiceTest {

    private final JwtService jwt = new JwtService(
            "test-secret-minimum-32-characters-long",
            15L
    );

    @Test
    void round_trip() {
        UserAccount user = UserAccount.builder()
                .id(UUID.randomUUID())
                .locale("uz")
                .build();

        String token = jwt.mint(user, List.of("customer"));
        Optional<Claims> claims = jwt.parseSafe(token);

        assertThat(claims).isPresent();
        assertThat(jwt.subjectAsUuid(claims.get())).isEqualTo(user.getId());
        assertThat(jwt.roles(claims.get())).containsExactly("customer");
    }

    @Test
    void invalid_token_returns_empty() {
        assertThat(jwt.parseSafe("not.a.jwt")).isEmpty();
        assertThat(jwt.parseSafe("")).isEmpty();
    }

    @Test
    void short_secret_throws() {
        assertThatThrownBy(() -> new JwtService("short", 15L))
                .isInstanceOf(IllegalStateException.class);
    }
}
