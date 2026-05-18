package com.zeyvo.common.web;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * In-memory rate limiting per (category, client-IP).
 * Enabled only when zeyvo.rate-limit.enabled=true (production).
 * Switch to bucket4j-redis backend when running multiple JVM instances.
 */
@Component
@ConditionalOnProperty(name = "zeyvo.rate-limit.enabled", havingValue = "true")
@Order(1)
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private record BucketEntry(Bucket bucket, Instant lastUsed) {}
    private final ConcurrentHashMap<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    /** Evict entries not accessed in the last 2 hours to prevent unbounded growth. */
    @Scheduled(fixedDelay = 3_600_000)
    void evictStaleBuckets() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(2));
        buckets.entrySet().removeIf(e -> e.getValue().lastUsed().isBefore(cutoff));
        log.debug("Rate-limit bucket eviction complete; remaining: {}", buckets.size());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String path   = req.getRequestURI();
        String method = req.getMethod();

        // Health / actuator pass-through — never rate-limit monitoring probes
        if (path.startsWith("/actuator") || "/api/v1/health".equals(path)) {
            chain.doFilter(req, res);
            return;
        }

        String ip       = resolveIp(req);
        String category = resolveCategory(method, path);
        String key      = category + ":" + ip;
        BucketEntry entry = buckets.compute(key, (k, existing) ->
                existing != null
                        ? new BucketEntry(existing.bucket(), Instant.now())
                        : new BucketEntry(createBucket(category), Instant.now()));
        Bucket bucket = entry.bucket();

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            res.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(req, res);
        } else {
            long retryAfterSec = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1;
            log.warn("[rate-limit] {} {} from {} — 429 retry-after={}s", method, path, ip, retryAfterSec);
            res.setStatus(429);
            res.setHeader("Retry-After", String.valueOf(retryAfterSec));
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write(
                    "{\"type\":\"https://zeyvo.app/errors/rate-limit\"," +
                    "\"title\":\"Too Many Requests\",\"status\":429," +
                    "\"code\":\"rate_limit.exceeded\"," +
                    "\"detail\":\"Rate limit exceeded. Please wait " + retryAfterSec + "s before retrying.\"}"
            );
        }
    }

    private String resolveIp(HttpServletRequest req) {
        // Respect Cloudflare / nginx X-Forwarded-For
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private String resolveCategory(String method, String path) {
        if ("POST".equalsIgnoreCase(method)) {
            if (path.contains("/auth/otp/"))    return "otp";      // 5/hr — SMS spam prevention
            if (path.matches(".*/v1/auth/.*"))  return "auth";     // 30/5min — brute-force prevention
            if (path.matches(".*/v1/tickets$")) return "ticket";   // 10/5min — anti-queue-spam
            if (path.contains("/webhook"))      return "webhook";  // 60/min — hardware adapters
        }
        return "default"; // 120/min — all other endpoints
    }

    private Bucket createBucket(String category) {
        return switch (category) {
            case "otp"     -> bucket(5,   Duration.ofHours(1));
            case "auth"    -> bucket(30,  Duration.ofMinutes(5));
            case "ticket"  -> bucket(10,  Duration.ofMinutes(5));
            case "webhook" -> bucket(60,  Duration.ofMinutes(1));
            default        -> bucket(120, Duration.ofMinutes(1));
        };
    }

    private static Bucket bucket(long capacity, Duration period) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(capacity, Refill.intervally(capacity, period)))
                .build();
    }
}
