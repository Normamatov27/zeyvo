package com.zeyvo.adapter.api;

import com.zeyvo.adapter.api.dto.DeviceResponse;
import com.zeyvo.adapter.api.dto.RegisterDeviceRequest;
import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.service.DeviceService;
import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.CurrentUser;
import com.zeyvo.queue.api.dto.TakeTicketRequest;
import com.zeyvo.queue.service.TicketService;
import com.zeyvo.tenant.domain.QueueService;
import com.zeyvo.tenant.service.AuthorizationService;
import com.zeyvo.tenant.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/devices")
@RequiredArgsConstructor
@Slf4j
public class DeviceController {

    private final DeviceService deviceService;
    private final TicketService ticketService;
    private final TenantService tenantService;
    private final AuthorizationService authz;

    /**
     * Register a new device. Requires staff+ role scoped to the target branch's org.
     * The one-time raw API token is returned in config._raw_token — capture it now.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    public DeviceResponse register(@Valid @RequestBody RegisterDeviceRequest req,
                                    @CurrentUser AuthPrincipal user) {
        authz.requireBranchInOrg(user, req.branchId());
        Device device = deviceService.register(
                req.branchId(), req.kind(), req.adapter(),
                req.config() != null ? req.config() : Map.of()
        );
        return DeviceResponse.from(device);
    }

    /** Update device last_seen_at and status. */
    @PostMapping("/{id}/heartbeat")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void heartbeat(
            @PathVariable UUID id,
            @RequestHeader("X-Device-Token") String token
    ) {
        deviceService.authenticate(id, token);
        deviceService.heartbeat(id, sha256(token));
    }

    /** List devices registered to a branch (staff in same org only; config stripped). */
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN')")
    public List<DeviceResponse> list(@RequestParam UUID branchId,
                                     @CurrentUser AuthPrincipal user) {
        authz.requireBranchInOrg(user, branchId);
        return deviceService.listByBranch(branchId).stream()
                .map(DeviceResponse::fromSafe)
                .toList();
    }

    /**
     * Inbound webhook from a hardware device.
     * Devices POST normalized JSON here; zeyvo translates it into domain actions.
     */
    @PostMapping("/{id}/webhook")
    public Map<String, Object> webhook(
            @PathVariable UUID id,
            @RequestHeader("X-Device-Token") String token,
            @RequestBody Map<String, Object> payload
    ) {
        Device device = deviceService.authenticate(id, token);
        deviceService.heartbeat(id, sha256(token));

        String cmdType = (String) payload.getOrDefault("type", "");
        log.info("[webhook] device={} branch={} cmd={}", id, device.getBranchId(), cmdType);

        return switch (cmdType) {
            case "take_ticket" -> {
                String serviceCode = (String) payload.get("service_code");
                QueueService svc = tenantService.getServiceByCodeOrThrow(device.getBranchId(), serviceCode);
                TakeTicketRequest req = new TakeTicketRequest(
                        device.getBranchId(), svc.getId(), serviceCode, "kiosk"
                );
                String number = ticketService.takeTicket(req, null).getNumber();
                yield Map.of("ticket_number", number, "status", "ok");
            }
            default -> {
                log.warn("[webhook] unknown command type '{}' from device {}", cmdType, id);
                yield Map.of("status", "ignored", "type", cmdType);
            }
        };
    }

    private String sha256(String input) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
