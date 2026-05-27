package com.zeyvo.analytics;

import com.zeyvo.common.web.DomainException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    public Map<String, Object> metrics(@PathVariable UUID branchId, Authentication auth) {
        requireBranchOrg(branchId, auth);
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
    public List<Map<String, Object>> hourly(@PathVariable UUID branchId, Authentication auth) {
        requireBranchOrg(branchId, auth);
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
    public List<Map<String, Object>> staff(@PathVariable UUID branchId, Authentication auth) {
        requireBranchOrg(branchId, auth);
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
    public List<Map<String, Object>> services(@PathVariable UUID branchId, Authentication auth) {
        requireBranchOrg(branchId, auth);
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

    // ── Appointment analytics (last N days) ─────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/appointments")
    @Operation(summary = "Appointment stats for a branch")
    @SuppressWarnings("unchecked")
    public Map<String, Object> appointments(@PathVariable UUID branchId,
                                            @RequestParam(defaultValue = "7") int days,
                                            Authentication auth) {
        requireBranchOrg(branchId, auth);

        Object[] row = (Object[]) em.createNativeQuery("""
                SELECT
                  COUNT(*)                                                             AS total,
                  COUNT(*) FILTER (WHERE status = 'booked')                           AS booked,
                  COUNT(*) FILTER (WHERE status = 'confirmed')                        AS confirmed,
                  COUNT(*) FILTER (WHERE status = 'checked_in')                       AS checked_in,
                  COUNT(*) FILTER (WHERE status = 'in_progress')                      AS in_progress,
                  COUNT(*) FILTER (WHERE status = 'served')                           AS served,
                  COUNT(*) FILTER (WHERE status = 'no_show')                          AS no_show,
                  COUNT(*) FILTER (WHERE status = 'cancelled')                        AS cancelled,
                  COUNT(*) FILTER (WHERE status = 'served')::numeric
                    / NULLIF(COUNT(*) FILTER (WHERE status NOT IN ('cancelled')), 0)  AS serve_rate,
                  AVG(EXTRACT(EPOCH FROM (scheduled_at - created_at)) / 3600.0)
                    FILTER (WHERE status NOT IN ('cancelled'))                        AS avg_lead_hours
                FROM app.appointment
                WHERE branch_id = :bid
                  AND scheduled_at > NOW() - MAKE_INTERVAL(days => :days)
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getSingleResult();

        // Per-provider rollup
        List<Object[]> providers = em.createNativeQuery("""
                SELECT p.id, p.full_name,
                  COUNT(*) FILTER (WHERE a.status = 'served')  AS served,
                  COUNT(*) FILTER (WHERE a.status = 'no_show') AS no_show,
                  COUNT(*)                                       AS total
                FROM app.appointment a
                JOIN app.provider p ON p.id = a.provider_id
                WHERE a.branch_id = :bid
                  AND a.scheduled_at > NOW() - MAKE_INTERVAL(days => :days)
                  AND a.provider_id IS NOT NULL
                GROUP BY p.id, p.full_name
                ORDER BY served DESC
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getResultList();

        var m = new LinkedHashMap<String, Object>();
        m.put("branchId", branchId.toString());
        m.put("days", days);
        m.put("total", toLong(row[0]));
        m.put("booked", toLong(row[1]));
        m.put("confirmed", toLong(row[2]));
        m.put("checkedIn", toLong(row[3]));
        m.put("inProgress", toLong(row[4]));
        m.put("served", toLong(row[5]));
        m.put("noShow", toLong(row[6]));
        m.put("cancelled", toLong(row[7]));
        Double serveRate = toDoubleOrNull(row[8]);
        m.put("serveRate", serveRate != null ? Math.round(serveRate * 1000.0) / 10.0 : 0.0);
        m.put("avgLeadHours", toDoubleOrNull(row[9]));
        m.put("byProvider", providers.stream().map(r -> {
            var pm = new LinkedHashMap<String, Object>();
            pm.put("providerId", r[0] == null ? null : r[0].toString());
            pm.put("providerName", r[1]);
            pm.put("served", toLong(r[2]));
            pm.put("noShow", toLong(r[3]));
            pm.put("total", toLong(r[4]));
            return pm;
        }).toList());
        return m;
    }

    // ── Provider performance (last N days) ──────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/providers")
    @Operation(summary = "Per-provider performance for a branch")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> providers(@PathVariable UUID branchId,
                                               @RequestParam(defaultValue = "30") int days,
                                               Authentication auth) {
        requireBranchOrg(branchId, auth);

        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  p.id, p.full_name, p.specialty,
                  COUNT(a.id)                                                               AS total,
                  COUNT(a.id) FILTER (WHERE a.status = 'served')                           AS served,
                  COUNT(a.id) FILTER (WHERE a.status = 'no_show')                          AS no_show,
                  AVG(a.duration_s)
                    FILTER (WHERE a.status = 'served')                                     AS avg_duration_s,
                  COUNT(a.id) FILTER (WHERE a.status = 'served')::numeric
                    / NULLIF(COUNT(a.id) FILTER (WHERE a.status NOT IN ('cancelled')), 0)  AS serve_rate,
                  COUNT(ps.id) FILTER (WHERE ps.day_of_week IS NOT NULL)                   AS schedule_days
                FROM app.provider p
                LEFT JOIN app.appointment a
                       ON a.provider_id = p.id
                      AND a.branch_id = :bid
                      AND a.scheduled_at > NOW() - MAKE_INTERVAL(days => :days)
                LEFT JOIN app.provider_schedule ps
                       ON ps.provider_id = p.id AND ps.branch_id = :bid
                WHERE p.organization_id = (SELECT organization_id FROM app.branch WHERE id = :bid)
                  AND p.active = true
                GROUP BY p.id, p.full_name, p.specialty
                ORDER BY served DESC
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getResultList();

        return rows.stream().map(r -> {
            var m = new LinkedHashMap<String, Object>();
            m.put("providerId", r[0] == null ? null : r[0].toString());
            m.put("providerName", r[1]);
            m.put("specialty", r[2]);
            m.put("total", toLong(r[3]));
            m.put("served", toLong(r[4]));
            m.put("noShow", toLong(r[5]));
            m.put("avgDurationS", toDoubleOrNull(r[6]));
            Double sr = toDoubleOrNull(r[7]);
            m.put("serveRate", sr != null ? Math.round(sr * 1000.0) / 10.0 : 0.0);
            m.put("scheduleDays", toLong(r[8]));
            return (Map<String, Object>) m;
        }).toList();
    }

    // ── Ratings trend (last N days) ──────────────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/ratings")
    @Operation(summary = "Daily ratings trend for a branch")
    @SuppressWarnings("unchecked")
    public Map<String, Object> ratings(@PathVariable UUID branchId,
                                       @RequestParam(defaultValue = "30") int days,
                                       Authentication auth) {
        requireBranchOrg(branchId, auth);

        Object[] summary = (Object[]) em.createNativeQuery("""
                SELECT
                  AVG(rating_stars::numeric)                                                        AS avg,
                  COUNT(*) FILTER (WHERE rating_stars IS NOT NULL)                                  AS count,
                  COUNT(*) FILTER (WHERE rating_stars = 5)::numeric
                    / NULLIF(COUNT(*) FILTER (WHERE rating_stars IS NOT NULL), 0)                  AS pct_5,
                  COUNT(*) FILTER (WHERE rating_stars IN (1, 2))::numeric
                    / NULLIF(COUNT(*) FILTER (WHERE rating_stars IS NOT NULL), 0)                  AS pct_low
                FROM app.ticket
                WHERE branch_id = :bid
                  AND joined_at > NOW() - MAKE_INTERVAL(days => :days)
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getSingleResult();

        List<Object[]> daily = em.createNativeQuery("""
                SELECT
                  DATE(joined_at AT TIME ZONE 'UTC+5')  AS day,
                  AVG(rating_stars::numeric)              AS avg_rating,
                  COUNT(*)                               AS count
                FROM app.ticket
                WHERE branch_id = :bid
                  AND joined_at > NOW() - MAKE_INTERVAL(days => :days)
                  AND rating_stars IS NOT NULL
                GROUP BY 1
                ORDER BY 1
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getResultList();

        List<Map<String, Object>> comments = em.createNativeQuery("""
                SELECT rating_stars, rating_comment, joined_at
                FROM app.ticket
                WHERE branch_id = :bid
                  AND rating_comment IS NOT NULL
                  AND joined_at > NOW() - MAKE_INTERVAL(days => :days)
                ORDER BY joined_at DESC
                LIMIT 5
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getResultList().stream().map(o -> {
                Object[] r = (Object[]) o;
                var cm = new LinkedHashMap<String, Object>();
                cm.put("stars", r[0] == null ? null : ((Number) r[0]).intValue());
                cm.put("comment", r[1]);
                cm.put("at", r[2] == null ? null : r[2].toString());
                return (Map<String, Object>) cm;
            }).toList();

        var m = new LinkedHashMap<String, Object>();
        m.put("branchId", branchId.toString());
        m.put("days", days);
        m.put("avgRating", toDoubleOrNull(summary[0]));
        m.put("ratingCount", toLong(summary[1]));
        Double pct5 = toDoubleOrNull(summary[2]);
        m.put("pct5Star", pct5 != null ? Math.round(pct5 * 1000.0) / 10.0 : 0.0);
        Double pctLow = toDoubleOrNull(summary[3]);
        m.put("pctLowStar", pctLow != null ? Math.round(pctLow * 1000.0) / 10.0 : 0.0);
        m.put("daily", daily.stream().map(r -> {
            var dm = new LinkedHashMap<String, Object>();
            dm.put("day", r[0] == null ? null : r[0].toString());
            dm.put("avgRating", toDoubleOrNull(r[1]));
            dm.put("count", toLong(r[2]));
            return dm;
        }).toList());
        m.put("recentComments", comments);
        return m;
    }

    // ── Peak hours heatmap (last N days) ─────────────────────────────────────

    @GetMapping("/v1/branches/{branchId}/metrics/peak")
    @Operation(summary = "Hour-of-day × day-of-week heatmap for a branch")
    @SuppressWarnings("unchecked")
    public Map<String, Object> peak(@PathVariable UUID branchId,
                                    @RequestParam(defaultValue = "14") int days,
                                    Authentication auth) {
        requireBranchOrg(branchId, auth);

        List<Object[]> rows = em.createNativeQuery("""
                SELECT
                  EXTRACT(DOW FROM joined_at AT TIME ZONE 'UTC+5')::int   AS dow,
                  EXTRACT(HOUR FROM joined_at AT TIME ZONE 'UTC+5')::int  AS hour,
                  COUNT(*)                                                   AS count
                FROM app.ticket
                WHERE branch_id = :bid
                  AND joined_at > NOW() - MAKE_INTERVAL(days => :days)
                GROUP BY 1, 2
                ORDER BY 1, 2
                """)
            .setParameter("bid", branchId)
            .setParameter("days", days)
            .getResultList();

        // Build sparse list — frontend builds the full 7×24 grid
        List<Map<String, Object>> cells = rows.stream().map(r -> {
            var cm = new LinkedHashMap<String, Object>();
            cm.put("dow", r[0] == null ? null : ((Number) r[0]).intValue());
            cm.put("hour", r[1] == null ? null : ((Number) r[1]).intValue());
            cm.put("count", toLong(r[2]));
            return (Map<String, Object>) cm;
        }).toList();

        long maxCount = cells.stream().mapToLong(c -> (long) c.get("count")).max().orElse(1L);

        var m = new LinkedHashMap<String, Object>();
        m.put("branchId", branchId.toString());
        m.put("days", days);
        m.put("maxCount", maxCount);
        m.put("cells", cells);
        return m;
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Verify the caller is super_admin OR owns the branch's org. */
    private void requireBranchOrg(UUID branchId, Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            Object rolesObj = claims.get("roles");
            if (rolesObj instanceof java.util.List<?> roles && roles.contains("SUPER_ADMIN")) return;
            Object orgIdObj = claims.get("org_id");
            if (orgIdObj instanceof String orgStr && !orgStr.isBlank()) {
                UUID callerOrg = UUID.fromString(orgStr);
                try {
                    UUID branchOrg = (UUID) em.createNativeQuery(
                            "SELECT organization_id FROM app.branch WHERE id = :bid")
                        .setParameter("bid", branchId)
                        .getSingleResult();
                    if (callerOrg.equals(branchOrg)) return;
                } catch (jakarta.persistence.NoResultException ignored) {}
            }
        }
        throw new DomainException("forbidden.cross_org",
                "Branch not in your organization", HttpStatus.FORBIDDEN);
    }

    private static long toLong(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }

    private static Double toDoubleOrNull(Object v) {
        return v instanceof Number n ? n.doubleValue() : null;
    }
}
