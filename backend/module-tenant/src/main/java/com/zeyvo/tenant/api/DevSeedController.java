package com.zeyvo.tenant.api;

import com.zeyvo.tenant.api.dto.BranchDetailDto;
import com.zeyvo.tenant.service.TenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Seed endpoint — only registered when running with the "local" profile. */
@RestController
@Profile("local")
@Tag(name = "Dev utilities")
@RequiredArgsConstructor
public class DevSeedController {

    private final TenantService tenantService;

    @PostMapping("/v1/dev/seed")
    @Operation(summary = "[DEV] Seed demo branch, services, and windows")
    public BranchDetailDto seed() {
        return tenantService.seedDemoData();
    }
}
