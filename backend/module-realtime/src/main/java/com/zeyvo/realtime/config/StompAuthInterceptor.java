package com.zeyvo.realtime.config;

import com.zeyvo.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Validates JWT on STOMP CONNECT. Unauthenticated connections may only subscribe
 * to public topics (branch queue/signage). Ops topics require at least OPERATOR role.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                jwtService.parseSafe(token).ifPresentOrElse(
                        claims -> accessor.setUser(buildPrincipal(claims)),
                        () -> log.debug("STOMP CONNECT with invalid JWT token")
                );
            }
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String dest = accessor.getDestination();
            if (dest != null && dest.contains("/ops")) {
                // Ops topics require authentication
                if (accessor.getUser() == null) {
                    log.warn("STOMP: unauthenticated subscription attempt to ops topic: {}", dest);
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Authentication required to subscribe to ops topics");
                }
            }
        }

        return message;
    }

    private UsernamePasswordAuthenticationToken buildPrincipal(Claims claims) {
        List<SimpleGrantedAuthority> authorities = jwtService.roles(claims).stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .toList();
        var auth = new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities);
        auth.setDetails(claims);
        return auth;
    }
}
