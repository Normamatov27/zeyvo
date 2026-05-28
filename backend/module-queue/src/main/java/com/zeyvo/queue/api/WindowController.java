package com.zeyvo.queue.api;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.api.dto.TicketDto;
import com.zeyvo.queue.service.TicketService;
import com.zeyvo.tenant.api.dto.WindowDeskDto;
import com.zeyvo.tenant.infra.WindowDeskRepository;
import com.zeyvo.tenant.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/v1/windows")
@Tag(name = "Windows")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
public class WindowController {

    private final TicketService ticketService;
    private final WindowDeskRepository windowRepo;
    private final AuthorizationService authz;

    private static final Set<String> VALID_STATUSES = Set.of("open", "closed", "paused", "idle");

    @GetMapping("/my")
    @Transactional(readOnly = true)
    @Operation(summary = "Get the window assigned to the current operator")
    public WindowDeskDto myWindow(@CurrentUser AuthPrincipal user) {
        return windowRepo.findByOperatorId(user.userId())
                .map(WindowDeskDto::from)
                .orElseThrow(() -> new DomainException("window.not_assigned",
                        "No window is assigned to you. Ask your manager to assign you.",
                        HttpStatus.NOT_FOUND));
    }

    @PostMapping("/{windowId}/assign")
    @Transactional
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Assign an operator to a window (pass ?userId= to assign someone else, omit for self)")
    public WindowDeskDto assignWindow(@PathVariable UUID windowId,
                                      @RequestParam(required = false) UUID userId,
                                      @CurrentUser AuthPrincipal user) {
        UUID operatorId = userId != null ? userId : user.userId();
        authz.requireWindowInOrg(user, windowId);
        windowRepo.findByOperatorId(operatorId).ifPresent(prev -> {
            if (!prev.getId().equals(windowId)) {
                prev.setOperatorId(null);
                windowRepo.save(prev);
            }
        });
        var window = windowRepo.findById(windowId)
                .orElseThrow(() -> new DomainException("window.not_found", "Window not found", HttpStatus.NOT_FOUND));
        window.setOperatorId(operatorId);
        windowRepo.save(window);
        return WindowDeskDto.from(window);
    }

    @DeleteMapping("/{windowId}/assign")
    @Transactional
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Unassign the operator from a window")
    public void unassignWindow(@PathVariable UUID windowId, @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        windowRepo.findById(windowId).ifPresent(w -> {
            w.setOperatorId(null);
            windowRepo.save(w);
        });
    }

    @PostMapping("/{windowId}/call-next")
    @Operation(summary = "Call the next waiting ticket for this window")
    public TicketDto callNext(@PathVariable UUID windowId,
                              @RequestParam UUID branchId,
                              @RequestParam(defaultValue = "0") int windowNumber,
                              @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        return ticketService.callNext(windowId, branchId, windowNumber)
                .map(TicketDto::from)
                .orElseThrow(() -> new DomainException(
                        "queue.empty", "No waiting tickets in this queue.", HttpStatus.NOT_FOUND));
    }

    @PostMapping("/{windowId}/serve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark the current ticket as served")
    public void serve(@PathVariable UUID windowId,
                      @RequestParam UUID ticketId,
                      @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        ticketService.markServed(ticketId, windowId);
    }

    @PostMapping("/{windowId}/no-show")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark the current ticket as no-show")
    public void noShow(@PathVariable UUID windowId,
                       @RequestParam UUID ticketId,
                       @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        ticketService.markNoShow(ticketId, windowId);
    }

    @GetMapping("/{windowId}/status")
    @Transactional(readOnly = true)
    @Operation(summary = "Get current window status and serving ticket")
    public Map<String, Object> status(@PathVariable UUID windowId, @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        var window = windowRepo.findById(windowId)
                .orElseThrow(() -> new DomainException("window.not_found", "Window not found", HttpStatus.NOT_FOUND));
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("windowId", windowId.toString());
        result.put("status", window.getStatus());
        UUID servingTicketId = window.getServingTicket();
        if (servingTicketId != null) {
            try {
                result.put("serving", TicketDto.from(ticketService.getOrThrow(servingTicketId)));
            } catch (Exception ignored) {}
        }
        return result;
    }

    @PatchMapping("/{windowId}/status")
    @Transactional
    @Operation(summary = "Open, close, or pause a window")
    public Map<String, Object> setStatus(@PathVariable UUID windowId,
                                         @RequestBody Map<String, String> body,
                                         @CurrentUser AuthPrincipal user) {
        authz.requireWindowInOrg(user, windowId);
        String newStatus = body.get("status");
        if (newStatus == null || !VALID_STATUSES.contains(newStatus)) {
            throw new DomainException("window.invalid_status",
                    "status must be one of: open, closed, paused, idle",
                    HttpStatus.BAD_REQUEST);
        }
        var window = windowRepo.findById(windowId)
                .orElseThrow(() -> new DomainException("window.not_found", "Window not found", HttpStatus.NOT_FOUND));
        window.setStatus(newStatus);
        windowRepo.save(window);
        return Map.of("id", windowId.toString(), "status", newStatus);
    }
}
