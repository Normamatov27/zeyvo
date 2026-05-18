package com.zeyvo.adapter.impl;

import com.zeyvo.adapter.domain.AdapterType;
import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.service.QueueDeviceAdapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Innomax HTTP adapter scaffold.
 *
 * Innomax's actual REST API is not yet documented. This implementation:
 * - Reads base_url from device.config["base_url"]
 * - Logs all outgoing calls with their intent
 * - Stubs response handling until we have the real Innomax protocol spec
 *
 * When the Innomax SDK/docs arrive: fill in the URL paths and payload shapes in
 * pushTicketCreated() and pushTicketCalled(). Everything else (retry, fan-out,
 * error isolation) is already wired in SyncOrchestrator.
 */
@Component
@Slf4j
public class InnomaxHttpAdapter implements QueueDeviceAdapter {

    private final RestClient http = RestClient.create();

    @Override
    public AdapterType type() {
        return AdapterType.INNOMAX_HTTP;
    }

    @Override
    public void onTicketCreated(Device device, String ticketNumber, String serviceCode, int queueSize) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null) {
            log.warn("[Innomax] device {} has no base_url configured", device.getId());
            return;
        }
        // TODO: replace with real Innomax endpoint + payload when docs arrive
        log.info("[Innomax] → ticketCreated device={} ticket={} service={} queueSize={}",
                device.getId(), ticketNumber, serviceCode, queueSize);
        // Placeholder call — actual path TBD from Innomax docs
        // http.post().uri(baseUrl + "/api/ticket/create")
        //     .body(Map.of("number", ticketNumber, "service", serviceCode))
        //     .retrieve().toBodilessEntity();
    }

    @Override
    public void onTicketCalled(Device device, String ticketNumber, int windowNumber) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null) {
            log.warn("[Innomax] device {} has no base_url configured", device.getId());
            return;
        }
        // TODO: replace with real Innomax endpoint + payload when docs arrive
        log.info("[Innomax] → ticketCalled device={} ticket={} window={}",
                device.getId(), ticketNumber, windowNumber);
        // Placeholder call — actual path TBD from Innomax docs
        // http.post().uri(baseUrl + "/api/display/call")
        //     .body(Map.of("number", ticketNumber, "window", windowNumber))
        //     .retrieve().toBodilessEntity();
    }

    @Override
    public boolean healthCheck(Device device) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null) return false;
        try {
            // TODO: use real Innomax health endpoint when docs arrive
            log.debug("[Innomax] healthCheck device={}", device.getId());
            return true; // stub — assume online until we know the real path
        } catch (Exception e) {
            log.warn("[Innomax] healthCheck failed for device {}: {}", device.getId(), e.getMessage());
            return false;
        }
    }

    private String configString(Device device, String key) {
        Object val = device.getConfig().get(key);
        return val instanceof String s ? s : null;
    }
}
