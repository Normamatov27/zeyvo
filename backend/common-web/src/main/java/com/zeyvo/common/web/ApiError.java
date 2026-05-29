package com.zeyvo.common.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/** RFC 9457 problem+json response body */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String type,
        String title,
        int status,
        String code,
        String detail,
        String traceId,
        Instant timestamp,
        Map<String, Object> errors
) {
    public static ApiError of(int status, String code, String detail, String traceId) {
        return new ApiError(
                "https://zeyvo.tech/errors/" + code.replace('.', '/'),
                toTitle(code),
                status,
                code,
                detail,
                traceId,
                Instant.now(),
                null
        );
    }

    public ApiError withErrors(Map<String, Object> errors) {
        return new ApiError(type, title, status, code, detail, traceId, timestamp, errors);
    }

    private static String toTitle(String code) {
        return code.replace('.', ' ')
                .replace('_', ' ')
                .substring(0, 1).toUpperCase()
                + code.replace('.', ' ').replace('_', ' ').substring(1);
    }
}
