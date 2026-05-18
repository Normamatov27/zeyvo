package com.zeyvo.adapter.service;

import com.zeyvo.adapter.domain.Device;
import com.zeyvo.adapter.domain.DeviceRepository;
import com.zeyvo.common.web.DomainException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;

    @Transactional
    public Device register(UUID branchId, String kind, String adapter, Map<String, Object> config) {
        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);
        Device device = Device.builder()
                .branchId(branchId)
                .kind(kind)
                .adapter(adapter)
                .config(config)
                .apiTokenHash(tokenHash)
                .status("registered")
                .build();
        deviceRepository.save(device);
        // Return with raw token in config so caller can capture it once
        device.getConfig().put("_raw_token", rawToken);
        return device;
    }

    @Transactional
    public void heartbeat(UUID deviceId, String tokenHash) {
        Device device = deviceRepository.findByIdAndApiTokenHash(deviceId, tokenHash)
                .orElseThrow(() -> DomainException.notFound("Device", deviceId));
        device.setLastSeenAt(Instant.now());
        device.setStatus("online");
    }

    @Transactional(readOnly = true)
    public List<Device> listByBranch(UUID branchId) {
        return deviceRepository.findByBranchId(branchId);
    }

    public Device authenticate(UUID deviceId, String rawToken) {
        String hash = sha256(rawToken);
        return deviceRepository.findByIdAndApiTokenHash(deviceId, hash)
                .orElseThrow(() -> DomainException.notFound("Device", deviceId));
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
