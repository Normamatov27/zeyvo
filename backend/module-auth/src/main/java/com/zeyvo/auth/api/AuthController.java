package com.zeyvo.auth.api;

import com.zeyvo.auth.api.dto.*;
import com.zeyvo.auth.service.AuthService;
import com.zeyvo.auth.service.TelegramBotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/auth")
@Tag(name = "Auth")
public class AuthController {

    private final AuthService authService;
    private final TelegramBotService telegramBotService;

    @Value("${zeyvo.telegram.bot-username:zeyvo_bot}")
    private String botUsername;

    public AuthController(AuthService authService, TelegramBotService telegramBotService) {
        this.authService = authService;
        this.telegramBotService = telegramBotService;
    }

    private static final String REFRESH_COOKIE = "zeyvo_refresh";
    private static final int REFRESH_COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 days

    @PostMapping("/telegram")
    @Operation(summary = "Authenticate with Telegram WebApp initData")
    public ResponseEntity<AuthResponse> telegram(
            @Valid @RequestBody TelegramAuthRequest req,
            HttpServletResponse res
    ) {
        AuthResponse auth = authService.authenticateViaTelegram(req.initData());
        setRefreshCookie(res, auth.refreshToken());
        // Return full response including refresh token (needed for cross-origin + TG Mini App)
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/telegram-widget")
    @Operation(summary = "Authenticate with Telegram Login Widget callback data")
    public ResponseEntity<AuthResponse> telegramWidget(
            @RequestBody Map<String, String> widgetData,
            HttpServletResponse res
    ) {
        AuthResponse auth = authService.authenticateViaWidget(widgetData);
        setRefreshCookie(res, auth.refreshToken());
        return ResponseEntity.ok(auth);
    }

    // ── Telegram bot-link web login ────────────────────────────────────────────

    @PostMapping("/tg-login-code")
    @Operation(summary = "Create a Telegram bot-link login code")
    public Map<String, Object> createTgLoginCode() {
        String code = telegramBotService.createWebLoginCode();
        String botUrl = "https://t.me/" + botUsername + "?start=weblogin_" + code;
        return Map.of("code", code, "botUrl", botUrl, "expiresInSeconds", 300);
    }

    @GetMapping("/tg-login-code/{code}")
    @Operation(summary = "Poll Telegram bot-link login — 202 while pending, 200 with tokens when confirmed")
    public ResponseEntity<?> pollTgLoginCode(
            @PathVariable String code,
            HttpServletResponse res
    ) {
        long telegramId = telegramBotService.pollWebLoginCode(code);
        if (telegramId == -1L) return ResponseEntity.notFound().build();      // expired / invalid
        if (telegramId == 0L)  return ResponseEntity.accepted().build();      // pending
        AuthResponse auth = authService.authenticateViaWebLogin(telegramId);
        telegramBotService.consumeWebLoginCode(code);
        setRefreshCookie(res, auth.refreshToken());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/otp/request")
    @Operation(summary = "Request OTP via SMS, Telegram, WhatsApp, or call")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> otpRequest(@Valid @RequestBody OtpRequestRequest req) {
        authService.requestOtp(req.phone(), req.channel());
        return Map.of("message", "OTP sent", "channel", req.channel());
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify OTP and get tokens")
    public ResponseEntity<AuthResponse> otpVerify(
            @Valid @RequestBody OtpVerifyRequest req,
            HttpServletResponse res
    ) {
        AuthResponse auth = authService.verifyOtp(req.phone(), req.code());
        setRefreshCookie(res, auth.refreshToken());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using httpOnly cookie or body")
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest req,
            HttpServletResponse res
    ) {
        // Prefer cookie; fall back to JSON body for Telegram Mini App (no cookies)
        String raw = refreshTokenFromRequest(req);
        AuthResponse auth = authService.refresh(raw);
        setRefreshCookie(res, auth.refreshToken());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke current refresh token")
    public void logout(HttpServletRequest req, HttpServletResponse res) {
        String raw = refreshTokenFromRequest(req);
        authService.logout(raw);
        clearRefreshCookie(res);
    }

    // ── Cookie helpers ─────────────────────────────────────────────────────────

    private void setRefreshCookie(HttpServletResponse res, String token) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(REFRESH_COOKIE_MAX_AGE);
        cookie.setAttribute("SameSite", "Lax");
        res.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse res) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        res.addCookie(cookie);
    }

    private String refreshTokenFromRequest(HttpServletRequest req) {
        // Cookie first
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (REFRESH_COOKIE.equals(c.getName()) && !c.getValue().isBlank()) {
                    return c.getValue();
                }
            }
        }
        // Fall back to JSON body (for Telegram Mini App or mobile)
        try {
            var body = req.getInputStream().readAllBytes();
            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body);
            var token = node.path("refresh_token").asText(null);
            if (token != null && !token.isBlank()) return token;
        } catch (Exception ignored) {}
        throw new com.zeyvo.common.web.DomainException(
                "auth.missing_refresh", "No refresh token provided",
                org.springframework.http.HttpStatus.BAD_REQUEST);
    }
}
