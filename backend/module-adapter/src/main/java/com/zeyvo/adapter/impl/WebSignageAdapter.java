package com.zeyvo.adapter.impl;

import com.zeyvo.adapter.domain.AdapterType;
import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.service.QueueDeviceAdapter;
import org.springframework.stereotype.Component;

/**
 * Web signage adapter — the wall display running at /signage/[branchId].
 * Like WebKioskAdapter, receives state via STOMP so push is a no-op.
 */
@Component
public class WebSignageAdapter implements QueueDeviceAdapter {

    @Override
    public AdapterType type() {
        return AdapterType.WEB_SIGNAGE;
    }

    @Override
    public void onTicketCreated(Device device, String ticketNumber, String serviceCode, int queueSize) {
    }

    @Override
    public void onTicketCalled(Device device, String ticketNumber, int windowNumber) {
    }

    @Override
    public boolean healthCheck(Device device) {
        return true;
    }
}
