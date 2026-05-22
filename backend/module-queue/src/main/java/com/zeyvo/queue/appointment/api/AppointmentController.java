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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
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

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an appointment")
    public AppointmentDto cancel(@PathVariable UUID id,
                                 @RequestParam(defaultValue = "false") boolean admin,
                                 @AuthenticationPrincipal Principal principal) {
        UUID requesterId = UUID.fromString(principal.getName());
        Appointment appt = service.cancel(id, requesterId, admin);
        return AppointmentDto.from(appt);
    }

    @PostMapping("/{id}/check-in")
    @Operation(summary = "Admin: check in an appointment → creates a live ticket")
    public TicketDto checkIn(@PathVariable UUID id,
                              @AuthenticationPrincipal Principal principal) {
        UUID operatorId = UUID.fromString(principal.getName());
        Ticket ticket = service.checkIn(id, operatorId);
        return TicketDto.from(ticket);
    }

    @GetMapping("/availability")
    @Operation(summary = "Get available slots for a branch on a given date")
    public List<AppointmentService.SlotInfo> availability(
            @RequestParam UUID branchId,
            @RequestParam String date,
            @RequestParam(required = false) UUID serviceId) {
        return service.getAvailability(branchId, date, serviceId);
    }
}
