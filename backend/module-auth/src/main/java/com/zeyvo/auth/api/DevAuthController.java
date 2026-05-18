package com.zeyvo.auth.api;

import com.zeyvo.auth.api.dto.AuthResponse;
import com.zeyvo.auth.domain.Session;
import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.SessionRepository;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.auth.service.JwtService;
import com.zeyvo.auth.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Dev-only login — creates or finds a user by phone, returns tokens immediately.
 * Only active in the "local" Spring profile. Never deployed to production.
 */
@RestController
@RequestMapping("/v1/auth/dev-login")
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class DevAuthController {

    private final UserAccountRepository userRepo;
    private final SessionRepository sessionRepo;
    private final JwtService jwtService;
    private final TelegramBotService telegramBotService;

    @PostMapping
    public AuthResponse devLogin(
            @RequestParam(defaultValue = "+998900000001") String phone,
            @RequestParam(defaultValue = "Test User") String name
    ) {
        log.warn("[DEV] Dev login used for phone={}", phone);

        UserAccount user = userRepo.findByPhone(phone).orElseGet(() -> {
            UserAccount u = UserAccount.builder()
                    .phone(phone)
                    .fullName(name)
                    .locale("uz")
                    .build();
            return userRepo.save(u);
        });

        List<String> dbRoles = userRepo.findRolesByUserId(user.getId());
        List<String> roles = dbRoles.isEmpty() ? List.of("org_admin", "customer") : dbRoles;
        String accessToken = jwtService.mint(user, roles);

        String rawRefresh = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        Session session = Session.builder()
                .userId(user.getId())
                .refreshHash(sha256(rawRefresh))
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();
        sessionRepo.save(session);

        return new AuthResponse(
                accessToken,
                rawRefresh,
                jwtService.parse(accessToken).getExpiration().toInstant(),
                user.getId().toString(),
                null,
                roles,
                user.getLocale()
        );
    }

    /**
     * Dev-only: simulate Telegram bot confirming a web login code.
     * Use this when bot token isn't configured locally.
     */
    @PostMapping("/confirm-tg-web")
    public ResponseEntity<Void> confirmTgWeb(
            @RequestParam String code,
            @RequestParam(defaultValue = "111111111") long telegramId
    ) {
        boolean ok = telegramBotService.confirmWebLoginCode(code, telegramId);
        return ok ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
