package com.zeyvo.tenant.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Public read endpoint for wall-display signage.
 * No authentication required — returns only the minimal data a display screen needs.
 * SecurityConfig marks GET /v1/signage/** as permitAll.
 */
@RestController
@RequestMapping("/v1/signage")
@Tag(name = "Signage")
@Transactional(readOnly = true)
public class SignageController {

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/{branchId}")
    @Operation(summary = "Public queue snapshot for a wall display")
    @SuppressWarnings("unchecked")
    public Map<String, Object> snapshot(@PathVariable UUID branchId) {
        // Branch info
        Object[] branchRow;
        try {
            branchRow = (Object[]) em.createNativeQuery(
                    "SELECT name, short_name, timezone FROM app.branch WHERE id = :id AND active = true")
                .setParameter("id", branchId)
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new com.zeyvo.common.web.DomainException(
                    "branch.not_found", "Branch not found",
                    org.springframework.http.HttpStatus.NOT_FOUND);
        }

        // Active tickets — only called/serving (what the wall display shows prominently)
        List<Object[]> ticketRows = em.createNativeQuery("""
                SELECT t.number, t.status, w.number AS window_num, w.label AS window_label,
                       s.name AS service_name, t.joined_at
                FROM app.ticket t
                LEFT JOIN app.window_desk w ON w.id = t.window_id
                LEFT JOIN app.service s ON s.id = t.service_id
                WHERE t.branch_id = :bid
                  AND t.status IN ('waiting', 'called', 'serving')
                ORDER BY
                  CASE t.status WHEN 'called' THEN 1 WHEN 'serving' THEN 2 ELSE 3 END,
                  t.joined_at
                LIMIT 50
                """)
            .setParameter("bid", branchId)
            .getResultList();

        List<Map<String, Object>> tickets = ticketRows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("number",      r[0]);
            m.put("status",      r[1]);
            m.put("windowNum",   r[2] != null ? ((Number) r[2]).intValue() : null);
            m.put("windowLabel", r[3]);
            m.put("serviceName", r[4]);
            m.put("joinedAt",    r[5] == null ? null : r[5].toString());
            return (Map<String, Object>) m;
        }).toList();

        // Open windows
        List<Object[]> windowRows = em.createNativeQuery("""
                SELECT number, label, status FROM app.window_desk
                WHERE branch_id = :bid AND status IN ('open', 'idle')
                ORDER BY number
                """)
            .setParameter("bid", branchId)
            .getResultList();

        List<Map<String, Object>> windows = windowRows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("number", ((Number) r[0]).intValue());
            m.put("label",  r[1]);
            m.put("status", r[2]);
            return (Map<String, Object>) m;
        }).toList();

        var result = new LinkedHashMap<String, Object>();
        result.put("branchId",  branchId.toString());
        result.put("name",      branchRow[0]);
        result.put("shortName", branchRow[1]);
        result.put("timezone",  branchRow[2]);
        result.put("tickets",   tickets);
        result.put("windows",   windows);
        result.put("waiting",   tickets.stream().filter(t -> "waiting".equals(t.get("status"))).count());
        return result;
    }
}
