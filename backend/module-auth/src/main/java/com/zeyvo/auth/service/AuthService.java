package com.zeyvo.auth.service;

import com.zeyvo.auth.api.dto.AuthResponse;
import com.zeyvo.auth.domain.Otp;
import com.zeyvo.auth.domain.Session;
import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.events.UserRegisteredEvent;
import com.zeyvo.auth.infra.repository.OtpRepository;
import com.zeyvo.auth.infra.repository.SessionRepository;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.common.web.DomainException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserAccountRepository userRepo;
    private final SessionRepository sessionRepo;
    private final OtpRepository otpRepo;
    private final JwtService jwtService;
    private final TelegramAuthService telegramAuthService;
    private final DevSmsService devSmsService;
    private final TelegramBotService telegramBotService;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;

    @Value("${zeyvo.jwt.refresh-days:30}")
    private int refreshDays;

    private final SecureRandom random = new SecureRandom();

    // ── Telegram auth ──────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse authenticateViaTelegram(String initData) {
        Map<String, Object> tgUser = telegramAuthService.validateAndExtractUser(initData);

        long telegramId = ((Number) tgUser.get("id")).longValue();
        String firstName = (String) tgUser.getOrDefault("first_name", "");
        String lastName  = (String) tgUser.getOrDefault("last_name", "");
        String username  = (String) tgUser.get("username");
        String languageCode = (String) tgUser.getOrDefault("language_code", "uz");

        boolean isNew = false;
        UserAccount user = userRepo.findByTelegramId(telegramId).orElse(null);
        if (user == null) {
            user = UserAccount.builder()
                    .telegramId(telegramId)
                    .fullName(firstName + (lastName != null ? " " + lastName : "").trim())
                    .locale(resolveLocale(languageCode))
                    .build();
            user = userRepo.save(user);
            isNew = true;
            log.info("New Telegram user registered: {}", user.getId());
        } else {
            // Refresh name/username from Telegram in case they changed
            user.setFullName(firstName + (lastName != null ? " " + lastName : "").trim());
        }

        if (isNew) {
            events.publishEvent(new UserRegisteredEvent(user.getId(), "telegram"));
        }

        return buildTokenPair(user);
    }

    @Transactional
    public AuthResponse authenticateViaWidget(Map<String, String> widgetData) {
        Map<String, String> validated = telegramAuthService.validateWidgetData(widgetData);

        long telegramId = Long.parseLong(validated.get("id"));
        String firstName = validated.getOrDefault("first_name", "");
        String lastName  = validated.get("last_name");
        String fullName  = firstName + (lastName != null ? " " + lastName : "");

        boolean isNew = false;
        UserAccount user = userRepo.findByTelegramId(telegramId).orElse(null);
        if (user == null) {
            user = UserAccount.builder()
                    .telegramId(telegramId)
                    .fullName(fullName.strip())
                    .locale("uz")
                    .build();
            user = userRepo.save(user);
            isNew = true;
            log.info("New Telegram widget user: {}", user.getId());
        } else {
            user.setFullName(fullName.strip());
        }
        if (isNew) events.publishEvent(new UserRegisteredEvent(user.getId(), "telegram_widget"));

        return buildTokenPair(user);
    }

    // ── Telegram web login auth ────────────────────────────────────────────────

    @Transactional
    public AuthResponse authenticateViaWebLogin(long telegramId) {
        boolean isNew = false;
        UserAccount user = userRepo.findByTelegramId(telegramId).orElse(null);
        if (user == null) {
            user = UserAccount.builder()
                    .telegramId(telegramId)
                    .locale("uz")
                    .build();
            user = userRepo.save(user);
            isNew = true;
            log.info("New user via Telegram web login: telegram_id={}", telegramId);
        }
        if (isNew) events.publishEvent(new UserRegisteredEvent(user.getId(), "telegram_web_login"));
        return buildTokenPair(user);
    }

    // ── OTP auth ───────────────────────────────────────────────────────────────

    @Transactional
    public void requestOtp(String phone, String channel) {
        // Rate limit: max 20 OTPs per hour per phone (legit users may resend a few times; tests need headroom)
        long recent = otpRepo.countByPhoneSince(phone, Instant.now().minus(1, ChronoUnit.HOURS));
        if (recent >= 20) {
            throw new DomainException("otp.rate_limit", "Too many OTP requests", HttpStatus.TOO_MANY_REQUESTS);
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        Otp otp = Otp.builder()
                .phone(phone)
                .codeHash(passwordEncoder.encode(code))
                .build();
        otpRepo.save(otp);

        switch (channel) {
            case "telegram" -> {
                UserAccount linked = userRepo.findByPhone(phone).orElse(null);
                if (linked == null || linked.getTelegramId() == null) {
                    throw new DomainException("otp.telegram_not_linked",
                            "This phone has no linked Telegram account. Use SMS instead.",
                            HttpStatus.UNPROCESSABLE_ENTITY);
                }
                telegramBotService.sendOtp(linked.getTelegramId(), code);
            }
            case "whatsapp", "call" ->
                throw new DomainException("otp.channel_unavailable",
                        "This delivery channel is not available yet. Use SMS.",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            default -> devSmsService.sendOtp(phone, code);
        }

        log.debug("OTP requested for {} via {}", phone, channel);
    }

    @Transactional
    public AuthResponse verifyOtp(String phone, String code) {
        Otp otp = otpRepo.findLatestValid(phone, Instant.now())
                .orElseThrow(() -> new DomainException("otp.not_found",
                        "No valid OTP found. Request a new one.", HttpStatus.UNPROCESSABLE_ENTITY));

        otp.recordAttempt();

        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            if (otp.getAttempts() >= 5) {
                throw new DomainException("otp.max_attempts", "Too many wrong attempts", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            throw new DomainException("otp.invalid", "Invalid code", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        otp.markUsed();

        boolean isNew = false;
        UserAccount user = userRepo.findByPhone(phone).orElse(null);
        if (user == null) {
            user = UserAccount.builder().phone(phone).build();
            user = userRepo.save(user);
            isNew = true;
            log.info("New phone user registered: {}", user.getId());
        }

        if (isNew) {
            events.publishEvent(new UserRegisteredEvent(user.getId(), "otp"));
        }

        return buildTokenPair(user);
    }

    // ── Refresh ────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = hashToken(rawRefreshToken);
        Session session = sessionRepo.findByRefreshHash(hash)
                .orElseThrow(() -> new DomainException("auth.invalid_refresh",
                        "Invalid or expired refresh token", HttpStatus.UNAUTHORIZED));

        if (!session.isValid()) {
            throw new DomainException("auth.invalid_refresh",
                    "Refresh token expired or revoked", HttpStatus.UNAUTHORIZED);
        }

        UserAccount user = userRepo.findById(session.getUserId())
                .orElseThrow(() -> DomainException.notFound("User", session.getUserId()));

        // Rotate: revoke old, issue new
        session.revoke();
        return buildTokenPair(user);
    }

    // ── Logout ─────────────────────────────────────────────────────────────────

    @Transactional
    public void logout(String rawRefreshToken) {
        String hash = hashToken(rawRefreshToken);
        sessionRepo.findByRefreshHash(hash).ifPresent(s -> s.setRevokedAt(Instant.now()));
    }

    @Transactional
    public void logoutAll(UUID userId) {
        sessionRepo.revokeAllForUser(userId, Instant.now());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private AuthResponse buildTokenPair(UserAccount user) {
        List<String> dbRoles = userRepo.findRolesByUserId(user.getId());
        List<String> roles = dbRoles.isEmpty() ? List.of("customer") : dbRoles;
        // Backfill org_id on the entity if the user was added as staff via role assignment
        // (user_account.organization_id may be null when roles are managed separately).
        // Super admins are exempt — they operate platform-wide with no org binding.
        boolean isSuperAdmin = dbRoles.contains("super_admin");
        if (!isSuperAdmin && user.getOrganizationId() == null) {
            userRepo.findOrgIdByUserId(user.getId()).ifPresent(oid -> {
                user.setOrganizationId(oid);
                userRepo.save(user);
            });
        }
        String accessToken = jwtService.mint(user, roles);

        String rawRefresh = UUID.randomUUID().toString().replace("-", "") +
                UUID.randomUUID().toString().replace("-", "");
        Session session = Session.builder()
                .userId(user.getId())
                .refreshHash(hashToken(rawRefresh))
                .expiresAt(Instant.now().plus(refreshDays, ChronoUnit.DAYS))
                .build();
        sessionRepo.save(session);

        return new AuthResponse(
                accessToken,
                rawRefresh,
                jwtService.parse(accessToken).getExpiration().toInstant(),
                user.getId().toString(),
                user.getOrganizationId() != null ? user.getOrganizationId().toString() : null,
                roles,
                user.getLocale()
        );
    }

    private String hashToken(String raw) {
        // Deterministic hash for lookup — not for security, we use SHA-256 via PasswordEncoder
        // but we need a consistent hash for DB lookup without full matching.
        // Using a keyed-hash approach: just SHA-256 the raw token directly.
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }

    private String resolveLocale(String tgLocale) {
        if (tgLocale == null) return "uz";
        return switch (tgLocale.toLowerCase()) {
            case "ru" -> "ru";
            case "en" -> "en";
            default -> "uz";
        };
    }
}
