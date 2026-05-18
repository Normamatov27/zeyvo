package com.zeyvo.adapter.service;

import com.zeyvo.adapter.domain.AdapterType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdapterRegistry {

    private final List<QueueDeviceAdapter> adapters;

    private Map<AdapterType, QueueDeviceAdapter> byType() {
        return adapters.stream().collect(Collectors.toMap(QueueDeviceAdapter::type, Function.identity()));
    }

    public Optional<QueueDeviceAdapter> find(AdapterType type) {
        return Optional.ofNullable(byType().get(type));
    }

    public QueueDeviceAdapter getOrThrow(AdapterType type) {
        return find(type).orElseThrow(() ->
                new IllegalStateException("No adapter registered for type: " + type));
    }
}
