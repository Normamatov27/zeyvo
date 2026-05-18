package com.zeyvo.common.web;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiError> handleDomain(DomainException ex, WebRequest request) {
        String traceId = traceId();
        log.warn("[{}] Domain error: {} — {}", traceId, ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getHttpStatus())
                .body(ApiError.of(ex.getHttpStatus().value(), ex.getCode(), ex.getMessage(), traceId));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.put(fe.getField(), fe.getDefaultMessage());
        }
        String traceId = traceId();
        return ResponseEntity
                .badRequest()
                .body(ApiError.of(400, "validation.failed", "Request validation failed", traceId)
                        .withErrors(errors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraint(ConstraintViolationException ex) {
        String traceId = traceId();
        return ResponseEntity
                .badRequest()
                .body(ApiError.of(400, "validation.failed", ex.getMessage(), traceId));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(403, "access.forbidden", "Access denied", traceId()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuth(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(401, "auth.required", "Authentication required", traceId()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        String traceId = traceId();
        log.error("[{}] Unexpected error", traceId, ex);
        return ResponseEntity
                .internalServerError()
                .body(ApiError.of(500, "internal.error", "An unexpected error occurred", traceId));
    }

    private static String traceId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
