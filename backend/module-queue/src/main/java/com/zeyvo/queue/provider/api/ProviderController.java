package com.zeyvo.queue.provider.api;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.queue.provider.api.dto.CreateProviderRequest;
import com.zeyvo.queue.provider.api.dto.ProviderDto;
import com.zeyvo.queue.provider.api.dto.ScheduleSlotDto;
import com.zeyvo.queue.provider.service.ProviderService;
import com.zeyvo.tenant.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/providers")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Providers")
public class ProviderController {

    private final ProviderService service;
    private final AuthorizationService authz;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List active providers — filter by branchId or orgId")
    public List<ProviderDto> list(
            @RequestParam(required = false) UUID branchId,
            @RequestParam(required = false) UUID orgId,
            @CurrentUser AuthPrincipal user) {
        if (branchId != null) {
            authz.requireBranchInOrg(user, branchId);
            return service.listForBranch(branchId);
        }
        UUID resolvedOrg = user.isSuperAdmin() && orgId != null ? orgId : authz.requireOrgId(user);
        return service.listForOrg(resolvedOrg);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER','SUPER_ADMIN')")
    @Operation(summary = "Create a provider (doctor / specialist)")
    public ProviderDto create(@Valid @RequestBody CreateProviderRequest req,
                              @CurrentUser AuthPrincipal user) {
        return service.create(req, authz.requireOrgId(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER','SUPER_ADMIN')")
    @Operation(summary = "Update provider details and branch assignments")
    public ProviderDto update(@PathVariable UUID id,
                              @Valid @RequestBody CreateProviderRequest req,
                              @CurrentUser AuthPrincipal user) {
        authz.requireProviderInOrg(user, id);
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Deactivate a provider")
    public void deactivate(@PathVariable UUID id, @CurrentUser AuthPrincipal user) {
        authz.requireProviderInOrg(user, id);
        service.deactivate(id);
    }

    @GetMapping("/{id}/schedule")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get provider weekly schedule")
    public List<ScheduleSlotDto> getSchedule(@PathVariable UUID id) {
        return service.getSchedule(id);
    }

    @PutMapping("/{id}/schedule")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER','SUPER_ADMIN')")
    @Operation(summary = "Upsert provider weekly schedule slots")
    public List<ScheduleSlotDto> upsertSchedule(@PathVariable UUID id,
                                                 @RequestBody List<ScheduleSlotDto> slots,
                                                 @CurrentUser AuthPrincipal user) {
        authz.requireProviderInOrg(user, id);
        return service.upsertSchedule(id, slots);
    }
}
