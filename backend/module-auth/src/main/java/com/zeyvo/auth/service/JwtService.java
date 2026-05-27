package com.zeyvo.auth.service;

import com.zeyvo.auth.domain.UserAccount;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@Slf4j
public class JwtService {

    private final SecretKey signingKey;
    private final long expiryMinutes;

    public JwtService(
            @Value("${zeyvo.jwt.secret}") String secret,
            @Value("${zeyvo.jwt.expiry-minutes:15}") long expiryMinutes
    ) {
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMinutes = expiryMinutes;
    }

    public String mint(UserAccount user, List<String> roles) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim("roles", roles)
                .claim("locale", user.getLocale())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expiryMinutes * 60)))
                .signWith(signingKey);
        // Only include org_id claim when the user is bound to an org.
        // Super admins with no org will have no org_id in their JWT.
        if (user.getOrganizationId() != null) {
            builder.claim("org_id", user.getOrganizationId().toString());
        }
        return builder.compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Returns empty if token is invalid/expired — never throws. */
    public Optional<Claims> parseSafe(String token) {
        try {
            return Optional.of(parse(token));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT parse failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public UUID subjectAsUuid(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    @SuppressWarnings("unchecked")
    public List<String> roles(Claims claims) {
        Object r = claims.get("roles");
        if (r instanceof List<?> list) return (List<String>) list;
        return List.of();
    }

    public Optional<UUID> orgId(Claims claims) {
        String raw = claims.get("org_id", String.class);
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(UUID.fromString(raw));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
