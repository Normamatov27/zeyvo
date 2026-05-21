package com.zeyvo.platform.onboarding;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public self-service org onboarding.
 *
 * Flow:
 *   1. POST /v1/onboarding/orgs  → creates org + user + org_admin role + (optional) first branch,
 *                                  triggers an OTP to the supplied phone via DevSMS.
 *   2. POST /v1/auth/otp/verify  → existing flow returns a JWT pair; roles include org_admin.
 *
 * Public endpoint — SecurityConfig must permitAll for /v1/onboarding/**.
 */
@RestController
@RequestMapping("/v1/onboarding")
@RequiredArgsConstructor
@Tag(name = "Onboarding")
public class OnboardingController {

    private final OnboardingService service;

    @PostMapping("/orgs")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Self-service: register a new organization and trigger OTP for the first org_admin")
    public OnboardingResponse register(@Valid @RequestBody OnboardingRequest req) {
        return service.register(req);
    }
}
