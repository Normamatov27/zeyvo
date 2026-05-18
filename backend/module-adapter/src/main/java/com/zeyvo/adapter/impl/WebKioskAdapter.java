package com.zeyvo.adapter.impl;

import com.zeyvo.adapter.domain.AdapterType;
import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.service.QueueDeviceAdapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Web kiosk adapter — the soft kiosk running at /kiosk/[branchId] in Next.js.
 * Display updates arrive via WebSocket (STOMP) from module-realtime, so this
 * adapter's push methods are no-ops. It exists so the registry can register
 * web kiosks as devices without special-casing.
 */
@Component
@Slf4j
public class WebKioskAdapter implements QueueDeviceAdapter {

    @Override
    public AdapterType type() {
        return AdapterType.WEB_KIOSK;
    }

    @Override
    public void onTicketCreated(Device device, String ticketNumber, String serviceCode, int queueSize) {
        // Web kiosk receives updates via STOMP; no push needed here
    }

    @Override
    public void onTicketCalled(Device device, String ticketNumber, int windowNumber) {
        // Web kiosk receives updates via STOMP; no push needed here
    }

    @Override
    public boolean healthCheck(Device device) {
        // Last-seen heartbeat is managed by DeviceService; always considered healthy from adapter perspective
        return true;
    }
}
