package com.zeyvo.common.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@Tag(name = "System")
public class HealthController {

    @GetMapping("/v1/health")
    @Operation(summary = "Simple liveness probe (no auth required)")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "ts", Instant.now());
    }
}
