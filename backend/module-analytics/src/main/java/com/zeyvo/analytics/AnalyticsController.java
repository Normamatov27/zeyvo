package com.zeyvo.analytics;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@Tag(name = "Analytics")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
@PreAuthorize("hasAnyRole('MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
public class AnalyticsController {

    @PersistenceContext
    private EntityManager em;

    // ── Branch KPI summary (last 24 h) ───────────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics")
    @Operation(summary = "KPI summary for a branch over the last 24 hours")
    @SuppressWarnings("unchecked")
    public Map<String, Object> metrics(@PathVariable UUID branchId) {
        Object[] row = (Object[]) em.createNativeQuery("""
                SELECT
                  COUNT(*)                                                             AS total,
                  COUNT(*) FILTER (WHERE status = 'served')                            AS served,
                  COUNT(*) FILTER (WHERE status = 'no_show')                           AS no_shows,
                  COUNT(*) FILTER (WHERE status = 'cancelled')                         AS cancelled,
                  AVG(EXTRACT(EPOCH FROM (called_at - joined_at)) / 60.0)
                    FILTER (WHERE status = 'served' AND called_at IS NOT NULL)         AS avg_wait_minutes,
                  AVG(EXTRACT(EPOCH FROM (served_at - serving_at)))
                    FILTER (WHERE status = 'served' AND serving_at IS NOT NULL)        AS avg_service_seconds,
                  COUNT(*) FILTER (WHERE source NOT IN ('walk_in','kiosk'))::numeric
                    / NULLIF(COUNT(*), 0)                                              AS remote_share,
                  AVG(rating_stars::numeric)
                    FILTER (WHERE rating_stars IS NOT NULL)                            AS avg_rating,
                  COUNT(*) FILTER (WHERE rating_stars IS NOT NULL)                     AS rating_count,
                  COUNT(*) FILTER (WHERE status = 'served')::numeric / 24.0           AS throughput_per_hour
                FROM app.ticket
                WHERE branch_id = :bid
                  AND joined_at > NOW() - INTERVAL '24 hours'
                """)
            .setParameter("bid", branchId)
            .getSingleResult();

        long total    = toLong(row[0]);
        long served   = toLong(row[1]);
        long noShows  = toLong(row[2]);
        long cancelled = toLong(row[3]);

        var m = new LinkedHashMap<String, Object>();
        m.put("branchId", branchId.toString());
        m.put("total", total);
        m.put("served", served);
        m.put("noShows", noShows);
        m.put("cancelled", cancelled);
        m.put("avgWaitMinutes", toDoubleOrNull(row[4]));
        m.put("avgServiceSeconds", toDoubleOrNull(row[5]));
        m.put("noShowRate", total > 0 ? Math.round(noShows * 1000.0 / total) / 10.0 : 0.0);
        Double remoteRatio = toDoubleOrNull(row[6]);
        m.put("remoteShare", remoteRatio != null ? Math.round(remoteRatio * 1000.0) / 10.0 : 0.0);
        m.put("avgRating", toDoubleOrNull(row[7]));
        m.put("ratingCount", toLong(row[8]));
        m.put("throughputPerHour", toDoubleOrNull(row[9]) != null ? toDoubleOrNull(row[9]) : 0.0);
        return m;
    }

    // ── Hourly breakdown (last 24 h) ─────────────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/hourly")
    @Operation(summary = "Hourly ticket breakdown for a branch over the last 24 hours")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> hourly(@PathVariable UUID branchId) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  date_trunc('hour', joined_at)                               AS hour,
                  COUNT(*)                                                     AS joined,
                  COUNT(*) FILTER (WHERE status = 'served')                    AS served,
                  COUNT(*) FILTER (WHERE status = 'no_show')                   AS no_shows,
                  AVG(EXTRACT(EPOCH FROM (called_at - joined_at)))
                    FILTER (WHERE called_at IS NOT NULL)                       AS avg_wait_s
                FROM app.ticket
                WHERE branch_id = :bid
                  AND joined_at > NOW() - INTERVAL '24 hours'
                GROUP BY 1
                ORDER BY 1
                """)
            .setParameter("bid", branchId)
            .getResultList();

        return rows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("hour", r[0] == null ? null : r[0].toString());
            m.put("joined", toLong(r[1]));
            m.put("served", toLong(r[2]));
            m.put("noShows", toLong(r[3]));
            m.put("avgWaitS", toDoubleOrNull(r[4]));
            return (Map<String, Object>) m;
        }).toList();
    }

    // ── Staff / window performance (last 7 days) ─────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/staff")
    @Operation(summary = "Per-window staff performance for a branch over the last 7 days")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> staff(@PathVariable UUID branchId) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  w.id                                                                   AS window_id,
                  w.number                                                               AS window_number,
                  w.label                                                                AS window_label,
                  COUNT(*) FILTER (WHERE t.status = 'served')                            AS served,
                  COUNT(*) FILTER (WHERE t.status = 'no_show')                           AS no_shows,
                  AVG(EXTRACT(EPOCH FROM (t.served_at - t.serving_at)))
                    FILTER (WHERE t.status = 'served' AND t.serving_at IS NOT NULL)     AS avg_service_s,
                  AVG(t.rating_stars::numeric)
                    FILTER (WHERE t.rating_stars IS NOT NULL)                            AS avg_rating
                FROM app.window_desk w
                LEFT JOIN app.ticket t
                       ON t.window_id = w.id
                      AND t.joined_at > NOW() - INTERVAL '7 days'
                WHERE w.branch_id = :bid
                GROUP BY w.id, w.number, w.label
                ORDER BY w.number
                """)
            .setParameter("bid", branchId)
            .getResultList();

        return rows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("windowId",      r[0] == null ? null : r[0].toString());
            m.put("windowNumber",  r[1] == null ? null : ((Number) r[1]).intValue());
            m.put("windowLabel",   r[2]);
            m.put("served",        toLong(r[3]));
            m.put("noShows",       toLong(r[4]));
            m.put("avgServiceSeconds", toDoubleOrNull(r[5]));
            m.put("avgRating",     toDoubleOrNull(r[6]));
            return (Map<String, Object>) m;
        }).toList();
    }

    // ── Per-service breakdown (last 24 h) ────────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/services")
    @Operation(summary = "Per-service stats for a branch over the last 24 hours")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> services(@PathVariable UUID branchId) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  s.id                                                                    AS service_id,
                  s.code                                                                  AS service_code,
                  s.name                                                                  AS service_name,
                  COUNT(t.id)                                                             AS total,
                  COUNT(t.id) FILTER (WHERE t.status = 'served')                         AS served,
                  COUNT(t.id) FILTER (WHERE t.status = 'no_show')                        AS no_shows,
                  COUNT(t.id) FILTER (WHERE t.status = 'cancelled')                      AS cancelled,
                  AVG(EXTRACT(EPOCH FROM (t.called_at - t.joined_at)) / 60.0)
                    FILTER (WHERE t.status = 'served' AND t.called_at IS NOT NULL)       AS avg_wait_minutes,
                  AVG(EXTRACT(EPOCH FROM (t.served_at - t.serving_at)))
                    FILTER (WHERE t.status = 'served' AND t.serving_at IS NOT NULL)      AS avg_service_seconds
                FROM app.service s
                LEFT JOIN app.ticket t
                       ON t.service_id = s.id
                      AND t.joined_at > NOW() - INTERVAL '24 hours'
                WHERE s.branch_id = :bid
                  AND s.active = true
                GROUP BY s.id, s.code, s.name
                ORDER BY total DESC
                """)
            .setParameter("bid", branchId)
            .getResultList();

        return rows.stream().map(r -> {
            long total   = toLong(r[3]);
            long served  = toLong(r[4]);
            long noShows = toLong(r[5]);
            var m = new LinkedHashMap<String, Object>();
            m.put("serviceId",         r[0] == null ? null : r[0].toString());
            m.put("serviceCode",       r[1]);
            m.put("serviceName",       r[2]);
            m.put("total",             total);
            m.put("served",            served);
            m.put("noShows",           noShows);
            m.put("cancelled",         toLong(r[6]));
            m.put("avgWaitMinutes",    toDoubleOrNull(r[7]));
            m.put("avgServiceSeconds", toDoubleOrNull(r[8]));
            m.put("serveRate",         total > 0 ? Math.round(served * 1000.0 / total) / 10.0 : 0.0);
            m.put("noShowRate",        total > 0 ? Math.round(noShows * 1000.0 / total) / 10.0 : 0.0);
            return (Map<String, Object>) m;
        }).toList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static long toLong(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }

    private static Double toDoubleOrNull(Object v) {
        return v instanceof Number n ? n.doubleValue() : null;
    }
}
