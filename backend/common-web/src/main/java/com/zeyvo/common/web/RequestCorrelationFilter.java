package com.zeyvo.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Populates SLF4J MDC with trace_id, tenant_id, and user_id so every log line
 * emitted during a request is automatically correlated without manual plumbing.
 *
 * Reads W3C traceparent if present; generates a UUID otherwise.
 * tenant_id and user_id are populated after Spring Security resolves the principal.
 */
@Component
@Order(0)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    private static final String TRACE_ID_KEY  = "trace_id";
    private static final String TENANT_ID_KEY = "tenant_id";
    private static final String USER_ID_KEY   = "user_id";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            String traceId = resolveTraceId(req);
            MDC.put(TRACE_ID_KEY, traceId);
            res.setHeader("X-Trace-Id", traceId);

            // Enrich MDC before the chain so log lines during request processing carry tenant/user context.
            // JwtAuthFilter runs at AUTHENTICATION order (before the filter chain body), so the principal
            // is available here if the request carries a valid JWT.
            Authentication preAuth = SecurityContextHolder.getContext().getAuthentication();
            enrichMdc(preAuth);

            chain.doFilter(req, res);
        } finally {
            MDC.remove(TRACE_ID_KEY);
            MDC.remove(TENANT_ID_KEY);
            MDC.remove(USER_ID_KEY);
        }
    }

    private void enrichMdc(Authentication auth) {
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            if (auth.getDetails() instanceof java.util.Map<?, ?> claims) {
                Object orgId = claims.get("org_id");
                if (orgId != null) MDC.put(TENANT_ID_KEY, orgId.toString());
            }
            MDC.put(USER_ID_KEY, auth.getName());
        }
    }

    private String resolveTraceId(HttpServletRequest req) {
        String traceparent = req.getHeader("traceparent");
        if (traceparent != null && !traceparent.isBlank()) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 3) return parts[1]; // trace-id segment
        }
        String xRequestId = req.getHeader("X-Request-Id");
        if (xRequestId != null && !xRequestId.isBlank()) return xRequestId;
        return UUID.randomUUID().toString().replace("-", "");
    }
}
