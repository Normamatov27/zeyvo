package com.zeyvo.common.web;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Distributed rate limiting per (category, client-IP) backed by Redis.
 * Works correctly across multiple app instances; state survives JVM restarts.
 * Enabled only when zeyvo.rate-limit.enabled=true (production).
 */
@Component
@ConditionalOnProperty(name = "zeyvo.rate-limit.enabled", havingValue = "true")
@Order(1)
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final ProxyManager<String> proxyManager;

    public RateLimitFilter(@Qualifier("rateLimitRedisClient") RedisClient redisClient) {
        StatefulRedisConnection<String, byte[]> connection =
                redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));

        this.proxyManager = LettuceBasedProxyManager.builderFor(connection)
                .withExpirationStrategy(
                        ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofHours(2)))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String path   = req.getRequestURI();
        String method = req.getMethod();

        // Health / actuator — never rate-limit monitoring probes
        if (path.startsWith("/actuator") || "/api/v1/health".equals(path)) {
            chain.doFilter(req, res);
            return;
        }

        String ip       = resolveIp(req);
        String category = resolveCategory(method, path);
        String key      = "rl:" + category + ":" + ip;

        Supplier<BucketConfiguration> configSupplier = () ->
                BucketConfiguration.builder().addLimit(configFor(category)).build();

        io.github.bucket4j.ConsumptionProbe probe;
        try {
            probe = proxyManager.builder().build(key, configSupplier).tryConsumeAndReturnRemaining(1);
        } catch (Exception redisEx) {
            log.warn("[rate-limit] Redis unavailable — allowing request through (fail-open): {}", redisEx.getMessage());
            chain.doFilter(req, res);
            return;
        }
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
                    "{\"type\":\"https://zeyvo.tech/errors/rate-limit\"," +
                    "\"title\":\"Too Many Requests\",\"status\":429," +
                    "\"code\":\"rate_limit.exceeded\"," +
                    "\"detail\":\"Rate limit exceeded. Please wait " + retryAfterSec + "s before retrying.\"}"
            );
        }
    }

    private String resolveIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private String resolveCategory(String method, String path) {
        if ("POST".equalsIgnoreCase(method)) {
            if (path.contains("/auth/otp/"))    return "otp";
            if (path.matches(".*/v1/auth/.*"))  return "auth";
            if (path.matches(".*/v1/tickets$")) return "ticket";
            if (path.contains("/webhook"))      return "webhook";
        }
        return "default";
    }

    private Bandwidth configFor(String category) {
        return switch (category) {
            case "otp"     -> Bandwidth.builder().capacity(20).refillIntervally(20,  Duration.ofHours(1)).build();
            case "auth"    -> Bandwidth.builder().capacity(30).refillIntervally(30,  Duration.ofMinutes(5)).build();
            case "ticket"  -> Bandwidth.builder().capacity(10).refillIntervally(10,  Duration.ofMinutes(5)).build();
            case "webhook" -> Bandwidth.builder().capacity(60).refillIntervally(60,  Duration.ofMinutes(1)).build();
            default        -> Bandwidth.builder().capacity(120).refillIntervally(120, Duration.ofMinutes(1)).build();
        };
    }
}
