package com.zeyvo.realtime.chat;

import com.zeyvo.common.web.DomainException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/chat")
@Tag(name = "Chat")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // ── Customer endpoints ────────────────────────────────────────────────────

    @PostMapping("/support/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Send a message to platform support")
    public Map<String, Object> sendSupportMessage(@RequestBody Map<String, String> body,
                                                   Authentication auth) {
        UUID customerId = resolveUserId(auth);
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        return chatService.sendCustomerMessage(customerId, "support", null, content);
    }

    @GetMapping("/support")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get the customer's support conversation")
    public Map<String, Object> getSupportConversation(Authentication auth) {
        return chatService.getConversation(resolveUserId(auth), "support", null);
    }

    @PostMapping("/orgs/{orgId}/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Send a message to an organisation")
    public Map<String, Object> sendOrgMessage(@PathVariable UUID orgId,
                                               @RequestBody Map<String, String> body,
                                               Authentication auth) {
        UUID customerId = resolveUserId(auth);
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        return chatService.sendCustomerMessage(customerId, "org", orgId, content);
    }

    @GetMapping("/orgs/{orgId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get the customer's conversation with an organisation")
    public Map<String, Object> getOrgConversation(@PathVariable UUID orgId, Authentication auth) {
        return chatService.getConversation(resolveUserId(auth), "org", orgId);
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    @GetMapping("/admin/conversations")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "List open conversations — org_admin sees their org, super_admin sees support")
    public List<Map<String, Object>> listConversations(Authentication auth) {
        if (hasRole(auth, "SUPER_ADMIN")) {
            return chatService.getAdminConversations("support", null);
        }
        UUID orgId = resolveOrgId(auth);
        return chatService.getAdminConversations("org", orgId);
    }

    @GetMapping("/admin/conversations/{convId}/messages")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Get messages for a conversation")
    public List<Map<String, Object>> getMessages(@PathVariable UUID convId) {
        return chatService.getConversationMessages(convId);
    }

    @PostMapping("/admin/conversations/{convId}/messages")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Reply to a conversation")
    public Map<String, Object> reply(@PathVariable UUID convId,
                                     @RequestBody Map<String, String> body,
                                     Authentication auth) {
        UUID senderId = resolveUserId(auth);
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        String role = hasRole(auth, "SUPER_ADMIN") ? "super_admin" : hasRole(auth, "ORG_ADMIN") ? "org_admin" : "manager";
        return chatService.sendAdminMessage(convId, senderId, role, content);
    }

    @PostMapping("/admin/conversations/{convId}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Close a conversation")
    public void close(@PathVariable UUID convId) {
        chatService.closeConversation(convId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UUID resolveUserId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            Object sub = claims.get("sub");
            if (sub instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new DomainException("auth.missing_user", "Cannot resolve user from token", HttpStatus.UNAUTHORIZED);
    }

    private UUID resolveOrgId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            Object orgId = claims.get("org_id");
            if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
        }
        throw new DomainException("auth.no_org", "No organisation in token", HttpStatus.FORBIDDEN);
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth != null && auth.getDetails() instanceof java.util.Map<?, ?> claims) {
            Object rolesObj = claims.get("roles");
            if (rolesObj instanceof java.util.List<?> roles) return roles.contains(role);
        }
        return false;
    }
}
