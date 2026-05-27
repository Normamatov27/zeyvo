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
import java.util.UUID;

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
        Number viewsToday = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM app.page_view WHERE visited_at >= CURRENT_DATE")
                .getSingleResult();
        Number viewsTotal = (Number) em.createNativeQuery(
                        "SELECT COUNT(*) FROM app.page_view")
                .getSingleResult();
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("totalOrganizations", orgs);
        result.put("totalBranches", branches);
        result.put("totalUsers", users);
        result.put("totalTicketsToday", ticketsToday.longValue());
        result.put("pageViewsToday", viewsToday.longValue());
        result.put("pageViewsTotal", viewsTotal.longValue());
        return result;
    }

    @PostMapping("/tenants")
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new tenant organization")
    public Map<String, Object> createTenant(@RequestBody Map<String, Object> body) {
        String name = (String) body.getOrDefault("name", "");
        if (name.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");

        String slug = body.containsKey("slug") && !((String) body.get("slug")).isBlank()
                ? (String) body.get("slug")
                : deriveSlug(name);

        if (orgRepo.findBySlug(slug).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already taken — try a different one");

        String plan    = body.containsKey("plan")    ? (String) body.get("plan")    : "trial";
        String country = body.containsKey("country") ? ((String) body.get("country")).toUpperCase() : "UZ";

        Organization org = Organization.builder()
                .slug(slug)
                .name(name)
                .country(country)
                .locale("uz")
                .plan(plan)
                .active(true)
                .build();
        org = orgRepo.save(org);

        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id", org.getId().toString());
        m.put("slug", org.getSlug());
        m.put("name", org.getName());
        m.put("plan", org.getPlan());
        m.put("country", org.getCountry());
        m.put("active", org.isActive());
        m.put("createdAt", org.getCreatedAt().toString());
        m.put("branchCount", 0);
        return m;
    }

    @DeleteMapping("/tenants/{id}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Permanently delete a tenant and all its data")
    public void deleteTenant(@PathVariable UUID id) {
        if (!orgRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found");

        // ticket.organization_id and ticket.branch_id have no ON DELETE CASCADE —
        // must delete tickets before branches and the org.
        em.createNativeQuery("DELETE FROM app.ticket WHERE organization_id = :oid")
                .setParameter("oid", id)
                .executeUpdate();

        // branch.organization_id also has no CASCADE; deleting branches cascades
        // window_desk, service, operating_hours, device, appointment, provider* tables.
        em.createNativeQuery("DELETE FROM app.branch WHERE organization_id = :oid")
                .setParameter("oid", id)
                .executeUpdate();

        // org deletion cascades: user_role, payment_request, chat_conversation,
        // and sets user_account.organization_id = NULL.
        orgRepo.deleteById(id);
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

    // ── Platform metrics ─────────────────────────────────────────────────────

    @GetMapping("/metrics/orgs")
    @Transactional(readOnly = true)
    @Operation(summary = "Per-org activity rollup")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> metricsOrgs() {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  o.id, o.name, o.plan,
                  COUNT(DISTINCT b.id)                                                     AS branch_count,
                  COUNT(t.id) FILTER (WHERE t.joined_at > NOW() - INTERVAL '7 days')      AS tickets_7d,
                  MAX(t.joined_at)                                                         AS last_activity,
                  CASE o.plan
                    WHEN 'starter'    THEN 499000
                    WHEN 'growth'     THEN 1490000
                    WHEN 'enterprise' THEN 4900000
                    ELSE 0
                  END                                                                      AS mrr_uzs
                FROM app.organization o
                LEFT JOIN app.branch b    ON b.organization_id = o.id
                LEFT JOIN app.ticket t    ON t.organization_id = o.id
                WHERE o.active = true
                GROUP BY o.id, o.name, o.plan
                ORDER BY tickets_7d DESC
                """)
            .getResultList();

        return rows.stream().map(r -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", r[0] == null ? null : r[0].toString());
            m.put("name", r[1]);
            m.put("plan", r[2]);
            m.put("branchCount", r[3] == null ? 0 : ((Number) r[3]).longValue());
            m.put("tickets7d", r[4] == null ? 0 : ((Number) r[4]).longValue());
            m.put("lastActivity", r[5] == null ? null : r[5].toString());
            m.put("mrrUzs", r[6] == null ? 0 : ((Number) r[6]).longValue());
            return (Map<String, Object>) m;
        }).toList();
    }

    @GetMapping("/metrics/plans")
    @Transactional(readOnly = true)
    @Operation(summary = "Plan distribution + recent upgrades")
    @SuppressWarnings("unchecked")
    public Map<String, Object> metricsPlans() {
        List<Object[]> dist = em.createNativeQuery("""
                SELECT plan, COUNT(*) FROM app.organization WHERE active = true GROUP BY plan ORDER BY plan
                """).getResultList();

        List<Object[]> upgrades = em.createNativeQuery("""
                SELECT o.id, o.name, o.plan, pr.approved_at
                FROM app.payment_request pr
                JOIN app.organization o ON o.id = pr.organization_id
                WHERE pr.status = 'approved'
                  AND pr.approved_at > NOW() - INTERVAL '30 days'
                ORDER BY pr.approved_at DESC
                LIMIT 10
                """).getResultList();

        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("distribution", dist.stream().map(r -> {
            var pm = new java.util.LinkedHashMap<String, Object>();
            pm.put("plan", r[0]);
            pm.put("count", r[1] == null ? 0 : ((Number) r[1]).longValue());
            return pm;
        }).toList());
        m.put("recentUpgrades", upgrades.stream().map(r -> {
            var um = new java.util.LinkedHashMap<String, Object>();
            um.put("orgId", r[0] == null ? null : r[0].toString());
            um.put("orgName", r[1]);
            um.put("plan", r[2]);
            um.put("approvedAt", r[3] == null ? null : r[3].toString());
            return um;
        }).toList());
        return m;
    }

    @GetMapping("/metrics/payments")
    @Transactional(readOnly = true)
    @Operation(summary = "Payment request stats + MRR")
    @SuppressWarnings("unchecked")
    public Map<String, Object> metricsPayments() {
        List<Object[]> byStatus = em.createNativeQuery("""
                SELECT status, plan, COUNT(*), SUM(amount_uzs)
                FROM app.payment_request
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY status, plan
                ORDER BY status, plan
                """).getResultList();

        Object[] mrr = (Object[]) em.createNativeQuery("""
                SELECT
                  SUM(CASE o.plan
                    WHEN 'starter'    THEN 499000
                    WHEN 'growth'     THEN 1490000
                    WHEN 'enterprise' THEN 4900000
                    ELSE 0
                  END)                AS mrr_uzs,
                  COUNT(*) FILTER (WHERE o.plan != 'trial') AS paid_orgs
                FROM app.organization o WHERE o.active = true
                """).getSingleResult();

        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("mrrUzs", mrr[0] == null ? 0 : ((Number) mrr[0]).longValue());
        m.put("paidOrgs", mrr[1] == null ? 0 : ((Number) mrr[1]).longValue());
        m.put("byStatus", byStatus.stream().map(r -> {
            var sm = new java.util.LinkedHashMap<String, Object>();
            sm.put("status", r[0]);
            sm.put("plan", r[1]);
            sm.put("count", r[2] == null ? 0 : ((Number) r[2]).longValue());
            sm.put("totalUzs", r[3] == null ? 0 : ((Number) r[3]).longValue());
            return sm;
        }).toList());
        return m;
    }

    @GetMapping("/metrics/chat")
    @Transactional(readOnly = true)
    @Operation(summary = "Support chat volume stats")
    @SuppressWarnings("unchecked")
    public Map<String, Object> metricsChat() {
        Object[] summary = (Object[]) em.createNativeQuery("""
                SELECT
                  COUNT(*) FILTER (WHERE status = 'open')                                  AS open_count,
                  COUNT(*) FILTER (WHERE status = 'closed'
                    AND updated_at > NOW() - INTERVAL '7 days')                            AS resolved_7d,
                  AVG(EXTRACT(EPOCH FROM (
                    SELECT MIN(m.sent_at) FROM app.chat_message m
                    WHERE m.conversation_id = c.id AND m.sender_role != 'customer'
                  ) - c.created_at) / 60.0)
                  FILTER (WHERE status = 'closed')                                         AS avg_first_reply_min
                FROM app.chat_conversation c
                """).getSingleResult();

        List<Object[]> daily = em.createNativeQuery("""
                SELECT DATE(sent_at), COUNT(*)
                FROM app.chat_message
                WHERE sent_at > NOW() - INTERVAL '7 days'
                GROUP BY 1 ORDER BY 1
                """).getResultList();

        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("openConversations", summary[0] == null ? 0 : ((Number) summary[0]).longValue());
        m.put("resolved7d", summary[1] == null ? 0 : ((Number) summary[1]).longValue());
        m.put("avgFirstReplyMin", summary[2] == null ? null : ((Number) summary[2]).doubleValue());
        m.put("messagesPerDay", daily.stream().map(r -> {
            var dm = new java.util.LinkedHashMap<String, Object>();
            dm.put("day", r[0] == null ? null : r[0].toString());
            dm.put("count", r[1] == null ? 0 : ((Number) r[1]).longValue());
            return dm;
        }).toList());
        return m;
    }

    @GetMapping("/metrics/users")
    @Transactional(readOnly = true)
    @Operation(summary = "User and staff activity stats")
    @SuppressWarnings("unchecked")
    public Map<String, Object> metricsUsers() {
        List<Object[]> byRole = em.createNativeQuery("""
                SELECT role, COUNT(DISTINCT user_id)
                FROM app.user_role
                GROUP BY role ORDER BY role
                """).getResultList();

        Number signups30d = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM app.user_account WHERE created_at > NOW() - INTERVAL '30 days'")
            .getSingleResult();

        Number active7d = (Number) em.createNativeQuery("""
                SELECT COUNT(DISTINCT actor_user_id) FROM app.audit_event
                WHERE occurred_at > NOW() - INTERVAL '7 days'
                  AND actor_user_id IS NOT NULL
                """).getSingleResult();

        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("totalUsers", userRepo.count());
        m.put("signups30d", signups30d.longValue());
        m.put("activeStaff7d", active7d.longValue());
        m.put("byRole", byRole.stream().map(r -> {
            var rm = new java.util.LinkedHashMap<String, Object>();
            rm.put("role", r[0]);
            rm.put("count", r[1] == null ? 0 : ((Number) r[1]).longValue());
            return rm;
        }).toList());
        return m;
    }

    private static String deriveSlug(String name) {
        String slug = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > 40) slug = slug.substring(0, 40).replaceAll("-+$", "");
        if (slug.length() < 3) slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
        return slug;
    }
}
