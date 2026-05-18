package com.zeyvo.platform;

import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.tenant.domain.Organization;
import com.zeyvo.tenant.infra.BranchRepository;
import com.zeyvo.tenant.infra.OrganizationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
