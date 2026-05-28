package com.zeyvo.realtime.chat;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.common.web.DomainException;
import com.zeyvo.tenant.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final AuthorizationService authz;

    // ── Customer endpoints ────────────────────────────────────────────────────

    @PostMapping("/support/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Send a message to platform support")
    public Map<String, Object> sendSupportMessage(@RequestBody Map<String, String> body,
                                                   @CurrentUser AuthPrincipal user) {
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        return chatService.sendCustomerMessage(user.userId(), "support", null, content);
    }

    @GetMapping("/support")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get the customer's support conversation")
    public Map<String, Object> getSupportConversation(@CurrentUser AuthPrincipal user) {
        return chatService.getConversation(user.userId(), "support", null);
    }

    @PostMapping("/orgs/{orgId}/messages")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Send a message to an organisation")
    public Map<String, Object> sendOrgMessage(@PathVariable UUID orgId,
                                               @RequestBody Map<String, String> body,
                                               @CurrentUser AuthPrincipal user) {
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        return chatService.sendCustomerMessage(user.userId(), "org", orgId, content);
    }

    @GetMapping("/orgs/{orgId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get the customer's conversation with an organisation")
    public Map<String, Object> getOrgConversation(@PathVariable UUID orgId, @CurrentUser AuthPrincipal user) {
        return chatService.getConversation(user.userId(), "org", orgId);
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    @GetMapping("/admin/conversations")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "List open conversations — org_admin sees their org, super_admin sees support")
    public List<Map<String, Object>> listConversations(@CurrentUser AuthPrincipal user) {
        if (user.isSuperAdmin()) {
            return chatService.getAdminConversations("support", null);
        }
        UUID orgId = authz.requireOrgId(user);
        return chatService.getAdminConversations("org", orgId);
    }

    @GetMapping("/admin/conversations/{convId}/messages")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Get messages for a conversation")
    public List<Map<String, Object>> getMessages(@PathVariable UUID convId,
                                                  @CurrentUser AuthPrincipal user) {
        authz.requireConversationAccess(user, convId);
        return chatService.getConversationMessages(convId);
    }

    @PostMapping("/admin/conversations/{convId}/messages")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Reply to a conversation")
    public Map<String, Object> reply(@PathVariable UUID convId,
                                     @RequestBody Map<String, String> body,
                                     @CurrentUser AuthPrincipal user) {
        authz.requireConversationAccess(user, convId);
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new DomainException("chat.empty", "Message content is required", HttpStatus.BAD_REQUEST);
        String role = user.isSuperAdmin() ? "super_admin" : user.hasRole("ORG_ADMIN") ? "org_admin" : "manager";
        return chatService.sendAdminMessage(convId, user.userId(), role, content);
    }

    @PostMapping("/admin/conversations/{convId}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Close a conversation")
    public void close(@PathVariable UUID convId,
                      @CurrentUser AuthPrincipal user) {
        authz.requireConversationAccess(user, convId);
        chatService.closeConversation(convId);
    }
}
