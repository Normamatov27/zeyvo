package com.zeyvo.queue.appointment.api;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.queue.appointment.api.dto.AppointmentDto;
import com.zeyvo.queue.appointment.api.dto.BookAppointmentRequest;
import com.zeyvo.queue.appointment.domain.Appointment;
import com.zeyvo.queue.appointment.service.AppointmentService;
import com.zeyvo.queue.api.dto.TicketDto;
import com.zeyvo.queue.domain.Ticket;
import com.zeyvo.tenant.service.AuthorizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/appointments")
@Tag(name = "Appointments")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService service;
    private final AuthorizationService authz;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Book an appointment slot")
    public AppointmentDto book(@Valid @RequestBody BookAppointmentRequest req,
                               @CurrentUser AuthPrincipal user) {
        Appointment appt = service.book(req, user.userId());
        return AppointmentDto.from(appt);
    }

    @GetMapping("/my")
    @Operation(summary = "Current user's appointments")
    public List<AppointmentDto> my(@CurrentUser AuthPrincipal user) {
        return service.getMyAppointments(user.userId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin: list appointments for a branch in a time range")
    public List<AppointmentDto> adminList(
            @RequestParam UUID branchId,
            @RequestParam Instant from,
            @RequestParam Instant to,
            @CurrentUser AuthPrincipal user) {
        authz.requireBranchInOrg(user, branchId);
        return service.getAdminView(branchId, from, to);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get appointment by ID (owner or staff in same org)")
    public AppointmentDto get(@PathVariable UUID id,
                              @CurrentUser AuthPrincipal user) {
        return service.getById(id, user);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an appointment (owner or staff)")
    public AppointmentDto cancel(@PathVariable UUID id,
                                 @CurrentUser AuthPrincipal user) {
        Appointment appt = service.cancel(id, user.userId(), user.roles(), user);
        return AppointmentDto.from(appt);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin: confirm a booked appointment")
    public AppointmentDto confirm(@PathVariable UUID id,
                                  @CurrentUser AuthPrincipal user) {
        authz.requireAppointmentInOrg(user, id);
        return AppointmentDto.from(service.confirm(id));
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin: check in an appointment (booked/confirmed → checked_in)")
    public AppointmentDto checkIn(@PathVariable UUID id,
                                  @CurrentUser AuthPrincipal user) {
        authz.requireAppointmentInOrg(user, id);
        return AppointmentDto.from(service.checkIn(id));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin: start serving — creates a live queue ticket (checked_in → in_progress)")
    public TicketDto startServing(@PathVariable UUID id,
                                  @CurrentUser AuthPrincipal user) {
        authz.requireAppointmentInOrg(user, id);
        Ticket ticket = service.startServing(id, user.userId());
        return TicketDto.from(ticket);
    }

    @PostMapping("/{id}/no-show")
    @PreAuthorize("hasAnyRole('OPERATOR', 'MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin: mark appointment as no-show")
    public AppointmentDto noShow(@PathVariable UUID id,
                                 @CurrentUser AuthPrincipal user) {
        authz.requireAppointmentInOrg(user, id);
        return AppointmentDto.from(service.markNoShow(id));
    }

    @GetMapping("/availability")
    @Operation(summary = "Get available slots for a branch on a given date")
    public List<AppointmentService.SlotInfo> availability(
            @RequestParam UUID branchId,
            @RequestParam String date,
            @RequestParam(required = false) UUID serviceId,
            @RequestParam(required = false) UUID providerId) {
        return service.getAvailability(branchId, date, serviceId, providerId);
    }

    // ── Waitlist ────────────────────────────────────────────────────────────────

    @PostMapping("/waitlist")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Join the waitlist for a date/branch/service")
    public void joinWaitlist(@RequestBody Map<String, String> body,
                             @CurrentUser AuthPrincipal user) {
        service.joinWaitlist(
                UUID.fromString(body.get("branchId")),
                UUID.fromString(body.get("serviceId")),
                body.containsKey("providerId") ? UUID.fromString(body.get("providerId")) : null,
                body.get("preferredDate"),
                user.userId()
        );
    }

    @GetMapping("/waitlist/my")
    @Operation(summary = "My waitlist entries")
    public List<Map<String, Object>> myWaitlist(@CurrentUser AuthPrincipal user) {
        return service.getMyWaitlist(user.userId());
    }

    @DeleteMapping("/waitlist/{waitlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Leave the waitlist")
    public void leaveWaitlist(@PathVariable UUID waitlistId,
                               @CurrentUser AuthPrincipal user) {
        service.leaveWaitlist(waitlistId, user.userId());
    }
}
