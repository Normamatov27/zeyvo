package com.zeyvo.adapter.service;

import com.zeyvo.adapter.domain.AdapterType;
import com.zeyvo.adapter.domain.Device;

/**
 * Contract every hardware adapter must implement.
 * onZeyvoEvent pushes queue state changes to the device.
 * healthCheck is called periodically to mark device status.
 */
public interface QueueDeviceAdapter {
    AdapterType type();
    void onTicketCreated(Device device, String ticketNumber, String serviceCode, int queueSize);
    void onTicketCalled(Device device, String ticketNumber, int windowNumber);
    boolean healthCheck(Device device);
}
