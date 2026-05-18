package com.zeyvo.tenant.api.dto;

import java.util.List;

public record UpdateWindowRequest(
        String label,
        List<String> serviceCodes
) {}
