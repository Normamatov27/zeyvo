package com.zeyvo.adapter.service;

import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.domain.DeviceRepository;
import com.zeyvo.queue.events.TicketCalled;
import com.zeyvo.queue.events.TicketCreated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Listens to queue domain events and fans out to all hardware devices in the affected branch.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SyncOrchestrator {

    private final DeviceRepository deviceRepository;
    private final AdapterRegistry registry;

    @Async
    @EventListener
    public void on(TicketCreated e) {
        List<Device> devices = deviceRepository.findByBranchId(e.branchId());
        for (Device device : devices) {
            registry.find(device.adapterType()).ifPresent(adapter -> {
                try {
                    adapter.onTicketCreated(device, e.ticketNumber(), e.source(), e.queueSize());
                } catch (Exception ex) {
                    log.warn("Adapter {} failed onTicketCreated for device {}: {}", device.getAdapter(), device.getId(), ex.getMessage());
                }
            });
        }
    }

    @Async
    @EventListener
    public void on(TicketCalled e) {
        List<Device> devices = deviceRepository.findByBranchId(e.branchId());
        for (Device device : devices) {
            registry.find(device.adapterType()).ifPresent(adapter -> {
                try {
                    adapter.onTicketCalled(device, e.ticketNumber(), e.windowNumber());
                } catch (Exception ex) {
                    log.warn("Adapter {} failed onTicketCalled for device {}: {}", device.getAdapter(), device.getId(), ex.getMessage());
                }
            });
        }
    }
}
