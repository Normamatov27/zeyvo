package com.zeyvo.queue.api;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.api.dto.TicketDto;
import com.zeyvo.queue.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

    @PersistenceContext
    private EntityManager em;

    private static final Set<String> VALID_STATUSES = Set.of("open", "closed", "paused", "idle");

    @PostMapping("/{windowId}/call-next")
    @Operation(summary = "Call the next waiting ticket for this window")
    public TicketDto callNext(@PathVariable UUID windowId,
                              @RequestParam UUID branchId,
                              @RequestParam(defaultValue = "0") int windowNumber) {
        return ticketService.callNext(windowId, branchId, windowNumber)
                .map(TicketDto::from)
                .orElseThrow(() -> new com.zeyvo.common.web.DomainException(
                        "queue.empty", "No waiting tickets in this queue.", org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @PostMapping("/{windowId}/serve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark the current ticket as served")
    public void serve(@PathVariable UUID windowId, @RequestParam UUID ticketId) {
        ticketService.markServed(ticketId, windowId);
    }

    @PostMapping("/{windowId}/no-show")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark the current ticket as no-show")
    public void noShow(@PathVariable UUID windowId, @RequestParam UUID ticketId) {
        ticketService.markNoShow(ticketId, windowId);
    }

    @GetMapping("/{windowId}/status")
    @Transactional(readOnly = true)
    @Operation(summary = "Get current window status and serving ticket")
    public Map<String, Object> status(@PathVariable UUID windowId) {
        Object[] row;
        try {
            row = (Object[]) em.createNativeQuery(
                    "SELECT w.status, w.serving_ticket FROM app.window_desk w WHERE w.id = :id")
                .setParameter("id", windowId)
                .getSingleResult();
        } catch (jakarta.persistence.NoResultException e) {
            throw new DomainException("window.not_found", "Window not found", HttpStatus.NOT_FOUND);
        }
        String windowStatus = (String) row[0];
        UUID servingTicketId = row[1] instanceof UUID u ? u : null;

        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("windowId", windowId.toString());
        result.put("status", windowStatus);
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
                                         @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || !VALID_STATUSES.contains(newStatus)) {
            throw new DomainException("window.invalid_status",
                    "status must be one of: open, closed, paused, idle",
                    HttpStatus.BAD_REQUEST);
        }
        int updated = em.createNativeQuery(
                        "UPDATE app.window_desk SET status = :status WHERE id = :id")
                .setParameter("status", newStatus)
                .setParameter("id", windowId)
                .executeUpdate();
        if (updated == 0) {
            throw new DomainException("window.not_found", "Window not found", HttpStatus.NOT_FOUND);
        }
        return Map.of("id", windowId.toString(), "status", newStatus);
    }
}
