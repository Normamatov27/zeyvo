package com.zeyvo.platform;

import com.zeyvo.tenant.infra.OrganizationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Payments")
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {

    private final OrganizationRepository orgRepo;

    @PersistenceContext
    private EntityManager em;

    // ── Customer: submit a payment claim ─────────────────────────────────────

    @PostMapping("/v1/payments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Submit a payment claim for a plan upgrade")
    public Map<String, Object> submitPayment(@RequestBody Map<String, Object> body,
                                              Authentication auth) {
        UUID orgId = resolveOrgId(auth);
        String plan = (String) body.get("plan");
        if (plan == null || (!plan.equals("starter") && !plan.equals("growth") && !plan.equals("enterprise")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan must be starter, growth, or enterprise");

        String currency = body.containsKey("currency") ? (String) body.get("currency") : "UZS";
        Object amtRaw = body.get("amount");
        BigDecimal amount;
        try {
            amount = amtRaw != null ? new BigDecimal(amtRaw.toString()) : BigDecimal.ZERO;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid amount");
        }

        String txRef = (String) body.getOrDefault("txRef", null);
        String note  = (String) body.getOrDefault("note", null);

        em.createNativeQuery("""
                INSERT INTO app.payment_request (org_id, plan, amount, currency, tx_ref, note, status)
                VALUES (:orgId, :plan, :amount, :currency, :txRef, :note, 'pending')
                """)
                .setParameter("orgId", orgId)
                .setParameter("plan", plan)
                .setParameter("amount", amount)
                .setParameter("currency", currency)
                .setParameter("txRef", txRef)
                .setParameter("note", note)
                .executeUpdate();

        return Map.of("status", "pending", "message", "Payment submitted. Super admin will confirm within 24h.");
    }

    // ── Customer: my payment requests ────────────────────────────────────────

    @GetMapping("/v1/payments/my")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','SUPER_ADMIN')")
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    @Operation(summary = "Get payment requests for the caller's organisation")
    public List<Map<String, Object>> myPayments(Authentication auth) {
        UUID orgId = resolveOrgId(auth);
        List<Object[]> rows = em.createNativeQuery("""
                SELECT id, plan, amount, currency, tx_ref, note, status, created_at, reviewed_at
                FROM app.payment_request WHERE org_id = :orgId ORDER BY created_at DESC LIMIT 20
                """)
                .setParameter("orgId", orgId)
                .getResultList();
        return rows.stream().map(PaymentController::rowToMap).toList();
    }

    // ── Super admin: all pending payments ────────────────────────────────────

    @GetMapping("/v1/platform/payments")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    @Operation(summary = "Super admin: list payment requests")
    public List<Map<String, Object>> listPayments(@RequestParam(defaultValue = "pending") String status) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT pr.id, pr.org_id, o.name as org_name, pr.plan, pr.amount, pr.currency,
                       pr.tx_ref, pr.note, pr.status, pr.created_at, pr.reviewed_at
                FROM app.payment_request pr
                JOIN app.organization o ON o.id = pr.org_id
                WHERE pr.status = :status
                ORDER BY pr.created_at DESC LIMIT 100
                """)
                .setParameter("status", status)
                .getResultList();
        return rows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("id", r[0] == null ? null : r[0].toString());
            m.put("orgId", r[1] == null ? null : r[1].toString());
            m.put("orgName", r[2]);
            m.put("plan", r[3]);
            m.put("amount", r[4]);
            m.put("currency", r[5]);
            m.put("txRef", r[6]);
            m.put("note", r[7]);
            m.put("status", r[8]);
            m.put("createdAt", r[9] == null ? null : r[9].toString());
            m.put("reviewedAt", r[10] == null ? null : r[10].toString());
            return (Map<String, Object>) m;
        }).toList();
    }

    @PostMapping("/v1/platform/payments/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Super admin: approve a payment — upgrades the org's plan")
    public Map<String, Object> approve(@PathVariable UUID id, Authentication auth) {
        UUID reviewerId = resolveUserId(auth);
        Object[] row = findPaymentOrThrow(id);
        UUID orgId = (UUID) row[1];
        String plan = (String) row[2];

        em.createNativeQuery("""
                UPDATE app.payment_request
                SET status = 'approved', reviewed_at = now(), reviewed_by = :rev
                WHERE id = :id
                """)
                .setParameter("rev", reviewerId)
                .setParameter("id", id)
                .executeUpdate();

        em.createNativeQuery("UPDATE app.organization SET plan = :plan WHERE id = :oid")
                .setParameter("plan", plan)
                .setParameter("oid", orgId)
                .executeUpdate();

        return Map.of("id", id.toString(), "status", "approved", "plan", plan);
    }

    @PostMapping("/v1/platform/payments/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Super admin: reject a payment request")
    public Map<String, Object> reject(@PathVariable UUID id, Authentication auth) {
        UUID reviewerId = resolveUserId(auth);
        findPaymentOrThrow(id);

        em.createNativeQuery("""
                UPDATE app.payment_request
                SET status = 'rejected', reviewed_at = now(), reviewed_by = :rev
                WHERE id = :id
                """)
                .setParameter("rev", reviewerId)
                .setParameter("id", id)
                .executeUpdate();

        return Map.of("id", id.toString(), "status", "rejected");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Object[] findPaymentOrThrow(UUID id) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, org_id, plan, amount, currency, status FROM app.payment_request WHERE id = :id")
                .setParameter("id", id)
                .getResultList();
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        return rows.get(0);
    }

    private UUID resolveOrgId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> claims) {
            Object orgId = claims.get("org_id");
            if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No organisation in token");
    }

    private UUID resolveUserId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> claims) {
            Object sub = claims.get("sub");
            if (sub instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cannot resolve user");
    }

    private static Map<String, Object> rowToMap(Object[] r) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", r[0] == null ? null : r[0].toString());
        m.put("plan", r[1]);
        m.put("amount", r[2]);
        m.put("currency", r[3]);
        m.put("txRef", r[4]);
        m.put("note", r[5]);
        m.put("status", r[6]);
        m.put("createdAt", r[7] == null ? null : r[7].toString());
        m.put("reviewedAt", r[8] == null ? null : r[8].toString());
        return m;
    }
}
