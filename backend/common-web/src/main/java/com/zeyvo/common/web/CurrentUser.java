package com.zeyvo.common.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

/**
 * Meta-annotation that injects the {@link AuthPrincipal} for the current request.
 * Resolves to {@code null} for unauthenticated (anonymous) requests.
 * Usage: {@code @CurrentUser AuthPrincipal user}
 */
@Target({ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal
public @interface CurrentUser {
}
