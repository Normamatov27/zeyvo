package com.zeyvo.realtime.config;

import com.zeyvo.auth.service.JwtService;
import com.zeyvo.common.web.AuthPrincipal;
import io.jsonwebtoken.Claims;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP channel interceptor that:
 * 1. On CONNECT — validates JWT and sets a typed AuthPrincipal as the session user.
 * 2. On SUBSCRIBE — enforces per-topic authorization rules.
 *
 * Topic authorization matrix:
 *   /topic/signage/{branchId}           — public (wall display)
 *   /topic/branches/{branchId}/queue    — public (customer queue view)
 *   /topic/branches/{branchId}/ops      — staff role + branch in caller's org
 *   /topic/tickets/{ticketId}           — authenticated (owner or staff — server filters events)
 *   /topic/chat/support                 — SUPER_ADMIN only
 *   /topic/chat/org/{orgId}             — SUPER_ADMIN or matching org staff
 *   /user/**                            — authenticated (Spring user-destination, principal-scoped)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    @PersistenceContext
    private EntityManager em;

    private static final Pattern BRANCH_OPS  = Pattern.compile("^/topic/branches/([^/]+)/ops$");
    private static final Pattern CHAT_ORG    = Pattern.compile("^/topic/chat/org/([^/]+)$");
    private static final Pattern TICKETS     = Pattern.compile("^/topic/tickets/([^/]+)$");
    private static final Pattern USER_DEST   = Pattern.compile("^/user/");

    @Override
    @Transactional(readOnly = true)
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                jwtService.parseSafe(token).ifPresentOrElse(
                        claims -> accessor.setUser(buildPrincipal(claims)),
                        () -> log.debug("STOMP CONNECT with invalid/expired JWT")
                );
            }
            // No token → anonymous connection; only public topics will be allowed below.
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String dest = accessor.getDestination();
            if (dest == null) return message;

            AuthPrincipal actor = extractActor(accessor);
            authorizeSubscription(dest, actor);
        }

        return message;
    }

    // ── Authorization ──────────────────────────────────────────────────────────

    private void authorizeSubscription(String dest, AuthPrincipal actor) {
        // Public topics — no auth required
        if (dest.startsWith("/topic/signage/") ||
            dest.startsWith("/topic/branches/") && dest.endsWith("/queue")) {
            return;
        }

        // Ops: staff in the branch's org
        Matcher opsMatcher = BRANCH_OPS.matcher(dest);
        if (opsMatcher.matches()) {
            requireAuthenticated(actor, dest);
            if (!actor.isStaff()) {
                deny("Ops topics require staff role", dest);
            }
            UUID branchId = parseUuid(opsMatcher.group(1), dest);
            requireBranchInOrg(actor, branchId, dest);
            return;
        }

        // Ticket topic: authenticated + either the ticket's owner or staff of the ticket's org
        Matcher ticketMatcher = TICKETS.matcher(dest);
        if (ticketMatcher.matches()) {
            requireAuthenticated(actor, dest);
            UUID ticketId = parseUuid(ticketMatcher.group(1), dest);
            requireTicketAccess(actor, ticketId, dest);
            return;
        }

        // Chat: support (SUPER_ADMIN), org (matching org staff)
        if ("/topic/chat/support".equals(dest)) {
            requireAuthenticated(actor, dest);
            if (!actor.isSuperAdmin()) deny("Only super-admins may subscribe to support chat", dest);
            return;
        }

        Matcher chatOrgMatcher = CHAT_ORG.matcher(dest);
        if (chatOrgMatcher.matches()) {
            requireAuthenticated(actor, dest);
            if (actor.isSuperAdmin()) return;
            UUID topicOrgId = parseUuid(chatOrgMatcher.group(1), dest);
            if (actor.orgId() == null || !actor.orgId().equals(topicOrgId)) {
                deny("Chat org topic not in your organization", dest);
            }
            if (!actor.isStaff()) deny("Chat admin topics require staff role", dest);
            return;
        }

        // User-destination (Spring-managed, principal-scoped): require authentication
        if (USER_DEST.matcher(dest).matches()) {
            requireAuthenticated(actor, dest);
            return;
        }

        // Unknown destination — deny by default (fail-closed)
        log.warn("STOMP: unknown destination, denying: {}", dest);
        throw new AccessDeniedException("Unknown subscription destination: " + dest);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private AuthPrincipal extractActor(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken token &&
            token.getPrincipal() instanceof AuthPrincipal p) {
            return p;
        }
        return null; // anonymous
    }

    private void requireAuthenticated(AuthPrincipal actor, String dest) {
        if (actor == null) {
            log.warn("STOMP: unauthenticated subscription denied: {}", dest);
            throw new AccessDeniedException("Authentication required for: " + dest);
        }
    }

    private void deny(String reason, String dest) {
        log.warn("STOMP: subscription denied ({}) for: {}", reason, dest);
        throw new AccessDeniedException(reason);
    }

    private void requireTicketAccess(AuthPrincipal actor, UUID ticketId, String dest) {
        if (actor.isSuperAdmin()) return;
        try {
            Object[] row = (Object[]) em.createNativeQuery(
                    "SELECT customer_id, organization_id FROM app.ticket WHERE id = :tid")
                .setParameter("tid", ticketId)
                .getSingleResult();
            UUID customerId = (UUID) row[0];
            UUID ticketOrgId = (UUID) row[1];
            // Allow if: caller is the ticket owner, or caller is staff in the ticket's org
            if (actor.userId().equals(customerId)) return;
            if (actor.isStaff() && actor.orgId() != null && actor.orgId().equals(ticketOrgId)) return;
        } catch (NoResultException ignored) {}
        deny("Not authorized to subscribe to this ticket's events", dest);
    }

    private void requireBranchInOrg(AuthPrincipal actor, UUID branchId, String dest) {
        if (actor.isSuperAdmin()) return;
        if (actor.orgId() == null) deny("No org in token", dest);
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                    "SELECT organization_id FROM app.branch WHERE id = :bid")
                .setParameter("bid", branchId)
                .getSingleResult();
            if (actor.orgId().equals(branchOrg)) return;
        } catch (NoResultException ignored) {}
        deny("Branch not in your organization", dest);
    }

    private UUID parseUuid(String s, String dest) {
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            deny("Invalid UUID in destination", dest);
            throw new IllegalStateException("unreachable");
        }
    }

    private UsernamePasswordAuthenticationToken buildPrincipal(Claims claims) {
        List<String> roles = jwtService.roles(claims);
        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .toList();
        UUID userId = jwtService.subjectAsUuid(claims);
        UUID orgId  = jwtService.orgId(claims).orElse(null);
        var principal = new AuthPrincipal(userId, orgId, Set.copyOf(roles));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
        auth.setDetails(claims);
        return auth;
    }
}
