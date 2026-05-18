package com.zeyvo.common.web;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DomainException extends RuntimeException {

    private final String code;
    private final HttpStatus httpStatus;

    public DomainException(String code, String detail) {
        this(code, detail, HttpStatus.BAD_REQUEST);
    }

    public DomainException(String code, String detail, HttpStatus httpStatus) {
        super(detail);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public static DomainException notFound(String entity, Object id) {
        return new DomainException(
                entity.toLowerCase() + ".not_found",
                entity + " not found: " + id,
                HttpStatus.NOT_FOUND
        );
    }

    public static DomainException conflict(String code, String detail) {
        return new DomainException(code, detail, HttpStatus.CONFLICT);
    }

    public static DomainException forbidden(String detail) {
        return new DomainException("access.forbidden", detail, HttpStatus.FORBIDDEN);
    }
}
