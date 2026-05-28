package com.zeyvo.auth.infra.security;

import com.zeyvo.auth.service.JwtService;
import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.TenantContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest req,
            @NonNull HttpServletResponse res,
            @NonNull FilterChain chain
    ) throws ServletException, IOException {

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }

        String token = header.substring(7);
        try {
            jwtService.parseSafe(token).ifPresent(claims -> {
                setAuthentication(claims);
                setTenantContext(claims);
            });
            chain.doFilter(req, res);
        } finally {
            // Always clear thread-local to prevent leaking between virtual threads
            TenantContext.clear();
        }
    }

    private void setAuthentication(Claims claims) {
        List<String> roles = jwtService.roles(claims);
        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .toList();

        var principal = new AuthPrincipal(
                jwtService.subjectAsUuid(claims),
                jwtService.orgId(claims).orElse(null),
                Set.copyOf(roles)
        );
        var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
        // Keep claims in details temporarily — controllers that still use auth.getDetails()-as-Map
        // (WindowController, AppointmentController adminList) continue to work during migration.
        auth.setDetails(claims);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void setTenantContext(Claims claims) {
        jwtService.orgId(claims).ifPresent(TenantContext::set);
    }
}
