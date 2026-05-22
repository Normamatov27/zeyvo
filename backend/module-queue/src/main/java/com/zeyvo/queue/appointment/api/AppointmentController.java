package com.zeyvo.queue.appointment.api;

import com.zeyvo.queue.appointment.api.dto.AppointmentDto;
import com.zeyvo.queue.appointment.api.dto.BookAppointmentRequest;
import com.zeyvo.queue.appointment.domain.Appointment;
import com.zeyvo.queue.appointment.service.AppointmentService;
import com.zeyvo.queue.api.dto.TicketDto;
import com.zeyvo.queue.domain.Ticket;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Book an appointment slot")
    public AppointmentDto book(@Valid @RequestBody BookAppointmentRequest req,
                               @AuthenticationPrincipal Principal principal) {
        UUID customerId = UUID.fromString(principal.getName());
        Appointment appt = service.book(req, customerId);
        return AppointmentDto.from(appt);
    }

    @GetMapping("/my")
    @Operation(summary = "Current user's appointments")
    public List<AppointmentDto> my(@AuthenticationPrincipal Principal principal) {
        UUID customerId = UUID.fromString(principal.getName());
        return service.getMyAppointments(customerId);
    }

    @GetMapping
    @Operation(summary = "Admin: list appointments for a branch in a time range")
    public List<AppointmentDto> adminList(
            @RequestParam UUID branchId,
            @RequestParam Instant from,
            @RequestParam Instant to) {
        return service.getAdminView(branchId, from, to);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get appointment by ID")
    public AppointmentDto get(@PathVariable UUID id) {
        return service.getById(id);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an appointment")
    public AppointmentDto cancel(@PathVariable UUID id,
                                 @RequestParam(defaultValue = "false") boolean admin,
                                 @AuthenticationPrincipal Principal principal) {
        UUID requesterId = UUID.fromString(principal.getName());
        Appointment appt = service.cancel(id, requesterId, admin);
        return AppointmentDto.from(appt);
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Admin: confirm a booked appointment")
    public AppointmentDto confirm(@PathVariable UUID id) {
        return AppointmentDto.from(service.confirm(id));
    }

    @PostMapping("/{id}/check-in")
    @Operation(summary = "Admin: check in an appointment (booked/confirmed → checked_in)")
    public AppointmentDto checkIn(@PathVariable UUID id) {
        return AppointmentDto.from(service.checkIn(id));
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Admin: start serving — creates a live queue ticket (checked_in → in_progress)")
    public TicketDto startServing(@PathVariable UUID id,
                                  @AuthenticationPrincipal Principal principal) {
        UUID operatorId = UUID.fromString(principal.getName());
        Ticket ticket = service.startServing(id, operatorId);
        return TicketDto.from(ticket);
    }

    @PostMapping("/{id}/no-show")
    @Operation(summary = "Admin: mark appointment as no-show")
    public AppointmentDto noShow(@PathVariable UUID id) {
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
                             @AuthenticationPrincipal Principal principal) {
        UUID customerId = UUID.fromString(principal.getName());
        service.joinWaitlist(
                UUID.fromString(body.get("branchId")),
                UUID.fromString(body.get("serviceId")),
                body.containsKey("providerId") ? UUID.fromString(body.get("providerId")) : null,
                body.get("preferredDate"),
                customerId
        );
    }

    @GetMapping("/waitlist/my")
    @Operation(summary = "My waitlist entries")
    public List<Map<String, Object>> myWaitlist(@AuthenticationPrincipal Principal principal) {
        UUID customerId = UUID.fromString(principal.getName());
        return service.getMyWaitlist(customerId);
    }

    @DeleteMapping("/waitlist/{waitlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Leave the waitlist")
    public void leaveWaitlist(@PathVariable UUID waitlistId,
                               @AuthenticationPrincipal Principal principal) {
        UUID customerId = UUID.fromString(principal.getName());
        service.leaveWaitlist(waitlistId, customerId);
    }
}
