package com.zeyvo.adapter.impl;

import com.zeyvo.adapter.domain.AdapterType;
import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.service.QueueDeviceAdapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.InetAddress;
import java.net.URI;
import java.util.Map;

/**
 * Generic HTTP adapter for any device that can receive JSON webhooks.
 * Reads from device.config:
 *   base_url     — required; webhook base URL (must not resolve to a private address)
 *   ticket_path  — optional; defaults to /webhook/ticket (POST)
 *   call_path    — optional; defaults to /webhook/call (POST)
 */
@Component
@Slf4j
public class GenericHttpAdapter implements QueueDeviceAdapter {

    private final RestClient http = RestClient.create();

    @Override
    public AdapterType type() {
        return AdapterType.GENERIC_HTTP;
    }

    @Override
    public void onTicketCreated(Device device, String ticketNumber, String serviceCode, int queueSize) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null || !isSafeUrl(baseUrl)) return;
        String path = configString(device, "ticket_path");
        if (path == null) path = "/webhook/ticket";
        try {
            http.post().uri(baseUrl + path)
                    .body(Map.of(
                            "event", "ticket.created",
                            "number", ticketNumber,
                            "service_code", serviceCode,
                            "queue_size", queueSize
                    ))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("[GenericHttp] onTicketCreated failed for device {}: {}", device.getId(), e.getMessage());
        }
    }

    @Override
    public void onTicketCalled(Device device, String ticketNumber, int windowNumber) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null || !isSafeUrl(baseUrl)) return;
        String path = configString(device, "call_path");
        if (path == null) path = "/webhook/call";
        try {
            http.post().uri(baseUrl + path)
                    .body(Map.of(
                            "event", "ticket.called",
                            "number", ticketNumber,
                            "window_number", windowNumber
                    ))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("[GenericHttp] onTicketCalled failed for device {}: {}", device.getId(), e.getMessage());
        }
    }

    @Override
    public boolean healthCheck(Device device) {
        String baseUrl = configString(device, "base_url");
        if (baseUrl == null || !isSafeUrl(baseUrl)) return false;
        String path = configString(device, "health_path");
        if (path == null) path = "/health";
        try {
            http.get().uri(baseUrl + path).retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Rejects URLs that resolve to loopback, link-local, or RFC-1918 private addresses.
     * Prevents SSRF attacks where a compromised admin configures a device pointing
     * to internal infrastructure (AWS IMDS, internal APIs, etc.).
     */
    static boolean isSafeUrl(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                return false;
            }
            String host = uri.getHost();
            if (host == null) return false;
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isSiteLocalAddress() || addr.isAnyLocalAddress()
                    || addr.isMulticastAddress()) {
                return false;
            }
            // Block 169.254.x.x (link-local / AWS IMDS) even if not caught above
            byte[] b = addr.getAddress();
            if (b.length == 4 && (b[0] & 0xFF) == 169 && (b[1] & 0xFF) == 254) return false;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String configString(Device device, String key) {
        Object val = device.getConfig().get(key);
        return val instanceof String s ? s : null;
    }
}
