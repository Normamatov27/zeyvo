package com.zeyvo.queue.provider.api;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.provider.api.dto.CreateProviderRequest;
import com.zeyvo.queue.provider.api.dto.ProviderDto;
import com.zeyvo.queue.provider.api.dto.ScheduleSlotDto;
import com.zeyvo.queue.provider.service.ProviderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/providers")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Providers")
public class ProviderController {

    private final ProviderService service;

    @PersistenceContext
    private EntityManager em;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List active providers — filter by branchId or orgId")
    public List<ProviderDto> list(
            @RequestParam(required = false) UUID branchId,
            @RequestParam(required = false) UUID orgId,
            Authentication auth) {
        if (branchId != null) {
            requireBranchOrg(branchId, auth);
            return service.listForBranch(branchId);
        }
        UUID resolvedOrg = orgId != null ? orgId : resolveOrgId(auth);
        // Non-super-admins can only query their own org
        if (!isSuperAdmin(auth)) {
            UUID callerOrg = resolveOrgId(auth);
            resolvedOrg = callerOrg;
        }
        return service.listForOrg(resolvedOrg);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER','SUPER_ADMIN')")
    @Operation(summary = "Create a provider (doctor / specialist)")
    public ProviderDto create(@Valid @RequestBody CreateProviderRequest req, Authentication auth) {
        return service.create(req, resolveOrgId(auth));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER','SUPER_ADMIN')")
    @Operation(summary = "Update provider details and branch assignments")
    public ProviderDto update(@PathVariable UUID id, @Valid @RequestBody CreateProviderRequest req,
                              Authentication auth) {
        requireProviderOrg(id, auth);
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
    @Operation(summary = "Deactivate a provider")
    public void deactivate(@PathVariable UUID id, Authentication auth) {
        requireProviderOrg(id, auth);
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
                                                 Authentication auth) {
        requireProviderOrg(id, auth);
        return service.upsertSchedule(id, slots);
    }

    /* ── ownership guards ─────────────────────────────────────────────── */

    private boolean isSuperAdmin(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> claims) {
            Object rolesObj = claims.get("roles");
            return rolesObj instanceof java.util.List<?> roles && roles.contains("SUPER_ADMIN");
        }
        return false;
    }

    private void requireBranchOrg(UUID branchId, Authentication auth) {
        if (isSuperAdmin(auth)) return;
        UUID callerOrg = resolveOrgId(auth);
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                            "SELECT organization_id FROM app.branch WHERE id = :bid")
                    .setParameter("bid", branchId).getSingleResult();
            if (callerOrg.equals(branchOrg)) return;
        } catch (NoResultException ignored) {}
        throw new DomainException("forbidden.cross_org", "Branch not in your organization", HttpStatus.FORBIDDEN);
    }

    private void requireProviderOrg(UUID providerId, Authentication auth) {
        if (isSuperAdmin(auth)) return;
        UUID callerOrg = resolveOrgId(auth);
        try {
            UUID provOrg = (UUID) em.createNativeQuery(
                            "SELECT organization_id FROM app.provider WHERE id = :pid")
                    .setParameter("pid", providerId).getSingleResult();
            if (callerOrg.equals(provOrg)) return;
        } catch (NoResultException ignored) {}
        throw new DomainException("forbidden.cross_org", "Provider not in your organization", HttpStatus.FORBIDDEN);
    }

    private UUID resolveOrgId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> claims) {
            Object orgId = claims.get("org_id");
            if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new DomainException("auth.no_organization",
                "Your account is not linked to any organization.",
                HttpStatus.FORBIDDEN);
    }
}
