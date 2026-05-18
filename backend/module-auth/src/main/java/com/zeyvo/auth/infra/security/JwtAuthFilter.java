package com.zeyvo.auth.infra.security;

import com.zeyvo.auth.service.JwtService;
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
        List<SimpleGrantedAuthority> authorities = jwtService.roles(claims).stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .toList();

        var auth = new UsernamePasswordAuthenticationToken(
                claims.getSubject(), // principal = userId string
                null,
                authorities
        );
        auth.setDetails(claims); // full claims available via ((Claims) auth.getDetails())
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void setTenantContext(Claims claims) {
        jwtService.orgId(claims).ifPresent(TenantContext::set);
    }
}
