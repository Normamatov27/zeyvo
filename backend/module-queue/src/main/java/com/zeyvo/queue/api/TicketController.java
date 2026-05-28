package com.zeyvo.queue.api;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.queue.api.dto.RateTicketRequest;
import com.zeyvo.queue.api.dto.TakeTicketRequest;
import com.zeyvo.queue.api.dto.TicketDto;
import com.zeyvo.queue.api.dto.TransferTicketRequest;
import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.queue.service.TicketService;
import com.zeyvo.tenant.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/tickets")
@Tag(name = "Tickets")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final AuthorizationService authz;

    @PersistenceContext
    private EntityManager em;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Join a queue")
    public TicketDto take(@Valid @RequestBody TakeTicketRequest req,
                          @CurrentUser AuthPrincipal user) {
        UUID customerId = user != null ? user.userId() : null;
        Ticket ticket = ticketService.takeTicket(req, customerId);
        return TicketDto.from(ticket);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get ticket status (owner or branch staff)")
    public TicketDto get(@PathVariable UUID id,
                         @CurrentUser AuthPrincipal user) {
        var ticket = ticketService.getOrThrow(id);

        // Owner always allowed; anonymous (null user) or wrong owner → 403 unless staff-in-org
        if (user == null) {
            throw com.zeyvo.common.web.DomainException.forbidden("Authentication required to view ticket details.");
        }
        boolean isOwner = ticket.getCustomerId() != null && ticket.getCustomerId().equals(user.userId());
        if (!isOwner && !user.isStaff()) {
            throw com.zeyvo.common.web.DomainException.forbidden("Not your ticket.");
        }
        if (!isOwner && user.isStaff()) {
            // Staff must be in the ticket's branch's org
            authz.requireBranchInOrg(user, ticket.getBranchId());
        }

        Integer position = null;
        Integer etaMinutes = null;
        Integer windowNum = null;
        String windowLabel = null;
        String serviceName = null;
        String branchName = null;

        if (ticket.getStatus().name().equals("WAITING")) {
            Number pos = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM app.ticket WHERE branch_id = :bid AND status = 'waiting' AND joined_at < :jat")
                .setParameter("bid", ticket.getBranchId())
                .setParameter("jat", ticket.getJoinedAt())
                .getSingleResult();
            position = pos.intValue();

            Number openW = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM app.window_desk WHERE branch_id = :bid AND status = 'open'")
                .setParameter("bid", ticket.getBranchId())
                .getSingleResult();
            int openWindows = openW != null ? openW.intValue() : 1;

            try {
                Number avgS = (Number) em.createNativeQuery(
                        "SELECT avg_duration_s FROM app.service WHERE id = :sid")
                    .setParameter("sid", ticket.getServiceId())
                    .getSingleResult();
                if (avgS != null) {
                    double avgMin = avgS.doubleValue() / 60.0;
                    etaMinutes = (int) Math.max(0, Math.round((position * avgMin) / Math.max(1, openWindows)));
                }
            } catch (Exception ignored) {}
        }

        if (ticket.getWindowId() != null) {
            try {
                Object[] row = (Object[]) em.createNativeQuery(
                        "SELECT number, label FROM app.window_desk WHERE id = :wid")
                    .setParameter("wid", ticket.getWindowId())
                    .getSingleResult();
                windowNum = ((Number) row[0]).intValue();
                windowLabel = (String) row[1];
            } catch (Exception ignored) {}
        }

        try {
            Object[] row = (Object[]) em.createNativeQuery(
                    "SELECT s.name, b.name FROM app.service s JOIN app.branch b ON b.id = s.branch_id " +
                    "WHERE s.id = :sid")
                .setParameter("sid", ticket.getServiceId())
                .getSingleResult();
            serviceName = (String) row[0];
            branchName = (String) row[1];
        } catch (Exception ignored) {}

        return TicketDto.fromEnriched(ticket, etaMinutes, position, windowNum, serviceName, branchName, windowLabel);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel a ticket")
    public void cancel(@PathVariable UUID id,
                       @CurrentUser AuthPrincipal user) {
        UUID customerId = user != null ? user.userId() : null;
        ticketService.cancel(id, customerId);
    }

    @GetMapping
    @Operation(summary = "Active queue for a branch")
    @SuppressWarnings("unchecked")
    public List<TicketDto> queue(@RequestParam UUID branchId) {
        List<com.zeyvo.queue.domain.Ticket> tickets = ticketService.getActiveQueueForBranch(branchId);
        if (tickets.isEmpty()) return List.of();

        List<UUID> serviceIds = tickets.stream()
                .map(com.zeyvo.queue.domain.Ticket::getServiceId)
                .distinct().toList();
        List<Object[]> nameRows = em.createNativeQuery(
                "SELECT s.id, s.name FROM app.service s WHERE s.id IN :ids")
            .setParameter("ids", serviceIds)
            .getResultList();
        var nameMap = new java.util.HashMap<UUID, String>();
        for (Object[] r : nameRows) nameMap.put((UUID) r[0], (String) r[1]);

        return tickets.stream().map(t ->
            TicketDto.fromEnriched(t, null, null, null, nameMap.get(t.getServiceId()), null, null)
        ).toList();
    }

    @PostMapping("/{id}/confirm-presence")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Customer confirms they are present (resets no-show timer)")
    public void confirmPresence(@PathVariable UUID id,
                                @CurrentUser AuthPrincipal user) {
        UUID customerId = user != null ? user.userId() : null;
        ticketService.confirmPresence(id, customerId);
    }

    @GetMapping("/my")
    @Operation(summary = "Authenticated user's ticket history (last 50)")
    @SuppressWarnings("unchecked")
    public List<TicketDto> my(@CurrentUser AuthPrincipal user) {
        if (user == null) return List.of();
        UUID userId = user.userId();
        List<com.zeyvo.queue.domain.Ticket> tickets = ticketService.getHistoryForUser(userId);
        if (tickets.isEmpty()) return List.of();

        // Batch-fetch service+branch names for all unique service IDs in one query
        List<UUID> serviceIds = tickets.stream()
                .map(com.zeyvo.queue.domain.Ticket::getServiceId)
                .distinct().toList();
        List<Object[]> nameRows = em.createNativeQuery(
                "SELECT s.id, s.name, b.name FROM app.service s " +
                "JOIN app.branch b ON b.id = s.branch_id WHERE s.id IN :ids")
            .setParameter("ids", serviceIds)
            .getResultList();
        var serviceInfo = new java.util.HashMap<UUID, String[]>();
        for (Object[] r : nameRows) {
            serviceInfo.put((UUID) r[0], new String[]{(String) r[1], (String) r[2]});
        }

        return tickets.stream().map(t -> {
            String[] info = serviceInfo.get(t.getServiceId());
            String svcName = info != null ? info[0] : null;
            String brnName = info != null ? info[1] : null;
            return TicketDto.fromEnriched(t, null, null, null, svcName, brnName, null);
        }).toList();
    }

    @PostMapping("/{id}/rate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Submit a satisfaction rating for a served ticket")
    public void rate(@PathVariable UUID id,
                     @Valid @RequestBody RateTicketRequest req,
                     @CurrentUser AuthPrincipal user) {
        ticketService.rate(id, req.stars(), req.comment(), user != null ? user.userId() : null);
    }

    @PostMapping("/{id}/transfer")
    @PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Transfer a waiting ticket to a specific window (operator/admin)")
    public TicketDto transfer(@PathVariable UUID id,
                               @Valid @RequestBody TransferTicketRequest req,
                               @CurrentUser AuthPrincipal user) {
        Ticket ticket = ticketService.transfer(id, req.toWindowId(), user);
        return TicketDto.from(ticket);
    }
}
