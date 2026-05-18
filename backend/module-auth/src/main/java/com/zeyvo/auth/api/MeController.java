package com.zeyvo.auth.api;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.auth.service.TelegramBotService;
import com.zeyvo.common.web.DomainException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/me")
@RequiredArgsConstructor
@Tag(name = "Me")
@SecurityRequirement(name = "bearerAuth")
public class MeController {

    private final UserAccountRepository userRepo;
    private final TelegramBotService telegramBot;

    @Value("${zeyvo.telegram.bot-username:zeyvo_bot}")
    private String botUsername;

    @GetMapping
    @Operation(summary = "Get current user profile")
    public UserProfileResponse me(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        UserAccount user = userRepo.findById(userId)
                .orElseThrow(() -> DomainException.notFound("User", userId));
        return UserProfileResponse.from(user);
    }

    public record UserProfileResponse(
            String id,
            String fullName,
            String phone,
            Long telegramId,
            String locale
    ) {
        static UserProfileResponse from(UserAccount u) {
            return new UserProfileResponse(
                    u.getId().toString(),
                    u.getFullName(),
                    u.getPhone(),
                    u.getTelegramId(),
                    u.getLocale()
            );
        }
    }

    public record UpdateProfileRequest(String fullName, String locale) {}

    @PostMapping("/link-telegram/init")
    @Operation(summary = "Generate a code to link this account to Telegram")
    public Map<String, String> initLinkTelegram(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        String code = telegramBot.generateLinkCode(userId);
        String botUrl = "https://t.me/" + botUsername + "?start=" + code;
        return Map.of("code", code, "botUrl", botUrl, "expiresInSeconds", "600");
    }

    @PatchMapping
    @Operation(summary = "Update profile")
    public UserProfileResponse update(Authentication auth,
                                     @RequestBody UpdateProfileRequest req) {
        UUID userId = UUID.fromString(auth.getName());
        UserAccount user = userRepo.findById(userId)
                .orElseThrow(() -> DomainException.notFound("User", userId));
        if (req.fullName() != null) user.setFullName(req.fullName());
        if (req.locale() != null) user.setLocale(req.locale());
        return UserProfileResponse.from(userRepo.save(user));
    }
}
