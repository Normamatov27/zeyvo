package com.zeyvo.tenant.api;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.tenant.api.dto.*;
import com.zeyvo.tenant.service.TenantService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import java.util.UUID;

@RestController
@Tag(name = "Branches")
@RequiredArgsConstructor
public class BranchController {

    private final TenantService tenantService;

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/v1/branches")
    @Operation(summary = "List all active branches (public, includes orgName)")
    public List<BranchDto> list() {
        return tenantService.listBranches();
    }

    @GetMapping("/v1/admin/branches")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "List branches scoped to the caller's org (super_admin sees all)")
    public List<BranchDto> adminList(Authentication auth) {
        UUID orgId = resolveOrgIdOrNull(auth);
        return orgId != null ? tenantService.listBranchesByOrg(orgId) : tenantService.listBranches();
    }

    @GetMapping("/v1/orgs")
    @Operation(summary = "List all active organisations (for customer booking flow)")
    public List<java.util.Map<String, Object>> listOrgs() {
        return tenantService.listOrgs();
    }

    @GetMapping("/v1/orgs/{orgId}/branches")
    @Operation(summary = "List active branches for a specific organisation")
    public List<BranchDto> branchesByOrg(@PathVariable UUID orgId) {
        return tenantService.listBranchesByOrg(orgId);
    }

    @GetMapping("/v1/branches/{id}")
    @Operation(summary = "Get branch details with services and windows")
    public BranchDetailDto get(@PathVariable UUID id) {
        return tenantService.getBranchDetail(id);
    }

    @GetMapping("/v1/branches/{id}/services")
    @Operation(summary = "List active services for a branch")
    public List<ServiceDto> services(@PathVariable UUID id) {
        return tenantService.listServices(id);
    }

    @GetMapping("/v1/branches/{id}/windows")
    @Operation(summary = "List windows for a branch")
    public List<WindowDeskDto> windows(@PathVariable UUID id) {
        return tenantService.listWindows(id);
    }

    @PostMapping("/v1/branches")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Create a new branch")
    public BranchDetailDto createBranch(@Valid @RequestBody CreateBranchRequest req,
                                        Authentication auth) {
        UUID orgId = resolveOrgId(auth);
        return tenantService.createBranch(orgId, req);
    }

    @PostMapping("/v1/branches/{id}/windows")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Add a window to a branch")
    public WindowDeskDto createWindow(@PathVariable UUID id,
                                      @Valid @RequestBody CreateWindowRequest req,
                                      Authentication auth) {
        requireBranchOrg(id, auth);
        return tenantService.createWindow(id, req);
    }

    @PostMapping("/v1/branches/{id}/services")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Add a service to a branch")
    public ServiceDto createService(@PathVariable UUID id,
                                    @Valid @RequestBody CreateServiceRequest req,
                                    Authentication auth) {
        requireBranchOrg(id, auth);
        return tenantService.createService(id, req);
    }

    @PatchMapping("/v1/services/{serviceId}/active")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Toggle service active state")
    public ServiceDto toggleService(@PathVariable UUID serviceId,
                                    @RequestParam boolean active,
                                    Authentication auth) {
        requireServiceOrg(serviceId, auth);
        return tenantService.toggleService(serviceId, active);
    }

    @PatchMapping("/v1/services/{serviceId}")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Update service details")
    public ServiceDto updateService(@PathVariable UUID serviceId,
                                    @RequestBody UpdateServiceRequest req,
                                    Authentication auth) {
        requireServiceOrg(serviceId, auth);
        return tenantService.updateService(serviceId, req);
    }

    @DeleteMapping("/v1/services/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a service")
    public void deleteService(@PathVariable UUID serviceId, Authentication auth) {
        requireServiceOrg(serviceId, auth);
        tenantService.deleteService(serviceId);
    }

    @PatchMapping("/v1/branches/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update branch settings")
    public BranchDetailDto updateBranch(@PathVariable UUID id,
                                        @RequestBody UpdateBranchRequest req,
                                        Authentication auth) {
        requireBranchOrg(id, auth);
        return tenantService.updateBranch(id, req);
    }

    @PatchMapping("/v1/windows/{windowId}")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Update window label and service filter")
    public WindowDeskDto updateWindow(@PathVariable UUID windowId,
                                      @RequestBody UpdateWindowRequest req,
                                      Authentication auth) {
        requireWindowOrg(windowId, auth);
        return tenantService.updateWindow(windowId, req);
    }

    @DeleteMapping("/v1/windows/{windowId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a window (must not be serving a ticket)")
    public void deleteWindow(@PathVariable UUID windowId, Authentication auth) {
        requireWindowOrg(windowId, auth);
        tenantService.deleteWindow(windowId);
    }

    @GetMapping("/v1/branches/{id}/operating-hours")
    @Operation(summary = "Get operating hours for a branch")
    public List<OperatingHoursDto> getHours(@PathVariable UUID id) {
        return tenantService.getOperatingHours(id);
    }

    @PutMapping("/v1/branches/{id}/operating-hours")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Replace operating hours for a branch (full replace)")
    public List<OperatingHoursDto> setHours(@PathVariable UUID id,
                                             @RequestBody List<OperatingHoursDto> hours,
                                             Authentication auth) {
        requireBranchOrg(id, auth);
        return tenantService.setOperatingHours(id, hours);
    }

    /* ── ownership guards ─────────────────────────────────────────────── */

    private boolean isSuperAdmin(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
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

    private void requireServiceOrg(UUID serviceId, Authentication auth) {
        if (isSuperAdmin(auth)) return;
        UUID callerOrg = resolveOrgId(auth);
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                            "SELECT b.organization_id FROM app.service s JOIN app.branch b ON b.id = s.branch_id WHERE s.id = :sid")
                    .setParameter("sid", serviceId).getSingleResult();
            if (callerOrg.equals(branchOrg)) return;
        } catch (NoResultException ignored) {}
        throw new DomainException("forbidden.cross_org", "Service not in your organization", HttpStatus.FORBIDDEN);
    }

    private void requireWindowOrg(UUID windowId, Authentication auth) {
        if (isSuperAdmin(auth)) return;
        UUID callerOrg = resolveOrgId(auth);
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                            "SELECT b.organization_id FROM app.window_desk w JOIN app.branch b ON b.id = w.branch_id WHERE w.id = :wid")
                    .setParameter("wid", windowId).getSingleResult();
            if (callerOrg.equals(branchOrg)) return;
        } catch (NoResultException ignored) {}
        throw new DomainException("forbidden.cross_org", "Window not in your organization", HttpStatus.FORBIDDEN);
    }

    private UUID resolveOrgId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            Object orgId = claims.get("org_id");
            if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new DomainException("auth.no_organization",
                "Your account is not linked to any organization. Contact support.",
                HttpStatus.FORBIDDEN);
    }

    private UUID resolveOrgIdOrNull(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            // super_admin may have no org_id — returns null → no filter (sees all)
            Object rolesObj = claims.get("roles");
            if (rolesObj instanceof java.util.List<?> roles && roles.contains("SUPER_ADMIN")) return null;
            Object orgId = claims.get("org_id");
            if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        return null;
    }
}
