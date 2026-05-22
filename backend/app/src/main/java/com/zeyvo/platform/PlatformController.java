package com.zeyvo.platform;

import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.tenant.domain.Branch;
import com.zeyvo.tenant.domain.Organization;
import com.zeyvo.tenant.infra.BranchRepository;
import com.zeyvo.tenant.infra.OrganizationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/platform")
@Tag(name = "Platform (super-admin)")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformController {

    private final OrganizationRepository orgRepo;
    private final BranchRepository branchRepo;
    private final UserAccountRepository userRepo;

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    @Operation(summary = "Platform-wide aggregate stats")
    public Map<String, Object> stats() {
        long orgs = orgRepo.count();
        long branches = branchRepo.count();
        long users = userRepo.count();
        Number ticketsToday = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM app.ticket WHERE joined_at >= CURRENT_DATE")
                .getSingleResult();
        return Map.of(
                "totalOrganizations", orgs,
                "totalBranches", branches,
                "totalUsers", users,
                "totalTicketsToday", ticketsToday.longValue()
        );
    }

    @GetMapping("/tenants")
    @Transactional(readOnly = true)
    @Operation(summary = "List all organizations")
    public List<Map<String, Object>> tenants() {
        return orgRepo.findAll().stream().map(o -> {
            long bc = branchRepo.countByOrganizationId(o.getId());
            return Map.<String, Object>of(
                    "id", o.getId().toString(),
                    "slug", o.getSlug(),
                    "name", o.getName(),
                    "plan", o.getPlan(),
                    "country", o.getCountry(),
                    "createdAt", o.getCreatedAt().toString(),
                    "branchCount", bc
            );
        }).toList();
    }

    @GetMapping("/tenants/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Tenant detail — org info, branches, staff count")
    public Map<String, Object> tenantDetail(@PathVariable UUID id) {
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));

        List<Branch> branches = branchRepo.findAll().stream()
                .filter(b -> b.getOrganizationId().equals(id))
                .sorted(Comparator.comparing(Branch::getCreatedAt))
                .toList();

        Number staffCount = (Number) em.createNativeQuery(
                        "SELECT COUNT(DISTINCT user_id) FROM app.user_role WHERE organization_id = :oid AND role != 'customer'")
                .setParameter("oid", id)
                .getSingleResult();

        Number ticketsTotal = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM app.ticket t JOIN app.branch b ON b.id = t.branch_id WHERE b.organization_id = :oid")
                .setParameter("oid", id)
                .getSingleResult();

        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("id", org.getId().toString());
        result.put("slug", org.getSlug());
        result.put("name", org.getName());
        result.put("country", org.getCountry());
        result.put("locale", org.getLocale());
        result.put("plan", org.getPlan());
        result.put("active", org.isActive());
        result.put("createdAt", org.getCreatedAt().toString());
        result.put("staffCount", staffCount.longValue());
        result.put("ticketsTotal", ticketsTotal.longValue());
        result.put("branches", branches.stream().map(b -> {
            var bm = new java.util.LinkedHashMap<String, Object>();
            bm.put("id", b.getId().toString());
            bm.put("name", b.getName());
            bm.put("slug", b.getSlug());
            bm.put("address", b.getAddress() != null ? b.getAddress() : "");
            bm.put("type", b.getType());
            bm.put("active", b.isActive());
            bm.put("createdAt", b.getCreatedAt().toString());
            return bm;
        }).toList());
        return result;
    }

    @PatchMapping("/tenants/{id}")
    @Transactional
    @Operation(summary = "Update tenant — name, plan, slug, country, active")
    public Map<String, Object> updateTenant(@PathVariable UUID id,
                                             @RequestBody Map<String, Object> body) {
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
        if (body.containsKey("name") && body.get("name") instanceof String s) org.setName(s);
        if (body.containsKey("plan") && body.get("plan") instanceof String s) org.setPlan(s);
        if (body.containsKey("country") && body.get("country") instanceof String s) org.setCountry(s);
        if (body.containsKey("slug") && body.get("slug") instanceof String s) org.setSlug(s);
        if (body.containsKey("active") && body.get("active") instanceof Boolean b) org.setActive(b);
        orgRepo.save(org);
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id", org.getId().toString());
        m.put("name", org.getName());
        m.put("slug", org.getSlug());
        m.put("plan", org.getPlan());
        m.put("country", org.getCountry());
        m.put("active", org.isActive());
        return m;
    }

    @GetMapping("/tenants/{id}/staff")
    @Transactional(readOnly = true)
    @Operation(summary = "List staff members of a tenant")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> tenantStaff(@PathVariable UUID id) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT u.id, u.full_name, u.phone, u.created_at,
                       array_agg(r.role ORDER BY r.role) AS roles
                FROM app.user_account u
                JOIN app.user_role r ON r.user_id = u.id
                WHERE r.organization_id = :oid AND u.deleted_at IS NULL
                GROUP BY u.id, u.full_name, u.phone, u.created_at
                ORDER BY u.created_at DESC
                LIMIT 500
                """).setParameter("oid", id).getResultList();

        return rows.stream().map(r -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", r[0].toString());
            m.put("fullName", r[1]);
            m.put("phone", r[2]);
            m.put("createdAt", r[3] == null ? null : r[3].toString());
            Object rolesRaw = r[4];
            List<String> roles;
            if (rolesRaw instanceof String[] arr) roles = List.of(arr);
            else if (rolesRaw instanceof Object[] arr)
                roles = java.util.Arrays.stream(arr).map(Object::toString).toList();
            else roles = List.of();
            m.put("roles", roles);
            return (Map<String, Object>) m;
        }).toList();
    }

    @PatchMapping("/tenants/{id}/branches/{branchId}")
    @Transactional
    @Operation(summary = "Update a branch in a tenant (name, active)")
    public Map<String, Object> updateBranch(@PathVariable UUID id,
                                             @PathVariable UUID branchId,
                                             @RequestBody Map<String, Object> body) {
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        if (!branch.getOrganizationId().equals(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Branch not in this organization");
        if (body.containsKey("active") && body.get("active") instanceof Boolean b) branch.setActive(b);
        if (body.containsKey("name") && body.get("name") instanceof String s) branch.setName(s);
        branchRepo.save(branch);
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id", branch.getId().toString());
        m.put("name", branch.getName());
        m.put("active", branch.isActive());
        return m;
    }

    @DeleteMapping("/tenants/{id}/staff/{userId}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove all roles for a user within a tenant")
    public void removeStaffFromOrg(@PathVariable UUID id, @PathVariable UUID userId) {
        em.createNativeQuery("DELETE FROM app.user_role WHERE user_id = :uid AND organization_id = :oid")
                .setParameter("uid", userId)
                .setParameter("oid", id)
                .executeUpdate();
    }

    @GetMapping("/audit")
    @Transactional(readOnly = true)
    @Operation(summary = "Recent audit events")
    public List<Map<String, Object>> audit(@RequestParam(defaultValue = "100") int limit) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                SELECT id, occurred_at, actor_user_id, actor_role, action,
                       target_type, target_id, trace_id, ip::text
                FROM app.audit_event
                ORDER BY occurred_at DESC
                LIMIT :limit
                """)
                .setParameter("limit", limit)
                .getResultList();

        return rows.stream().map(r -> {
            var map = new java.util.LinkedHashMap<String, Object>();
            map.put("id", r[0]);
            map.put("occurredAt", r[1] == null ? null : r[1].toString());
            map.put("actorUserId", r[2] == null ? null : r[2].toString());
            map.put("actorRole", r[3]);
            map.put("action", r[4]);
            map.put("targetType", r[5]);
            map.put("targetId", r[6] == null ? null : r[6].toString());
            map.put("traceId", r[7]);
            map.put("ip", r[8]);
            return (Map<String, Object>) map;
        }).toList();
    }
}
