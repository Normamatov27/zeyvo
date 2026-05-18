package com.zeyvo.auth.api;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.common.web.DomainException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin — Users")
@PreAuthorize("hasAnyRole('ORG_ADMIN', 'SUPER_ADMIN')")
public class AdminUserController {

    private final UserAccountRepository userRepo;

    @PersistenceContext
    private EntityManager em;

    private static final Set<String> VALID_ROLES = Set.of(
            "customer", "operator", "manager", "org_admin"
    );

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "List users (most recent 200)")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String phone
    ) {
        List<Object[]> rows;
        if (phone != null && !phone.isBlank()) {
            rows = em.createNativeQuery("""
                    SELECT u.id, u.full_name, u.phone, u.telegram_id, u.created_at,
                           COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
                    FROM app.user_account u
                    LEFT JOIN app.user_role r ON r.user_id = u.id
                    WHERE u.phone = :phone AND u.deleted_at IS NULL
                    GROUP BY u.id
                    LIMIT 50
                    """)
                    .setParameter("phone", phone)
                    .getResultList();
        } else {
            rows = em.createNativeQuery("""
                    SELECT u.id, u.full_name, u.phone, u.telegram_id, u.created_at,
                           COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
                    FROM app.user_account u
                    LEFT JOIN app.user_role r ON r.user_id = u.id
                    WHERE u.deleted_at IS NULL
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                    LIMIT 200
                    """)
                    .getResultList();
        }

        return rows.stream().map(r -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", r[0].toString());
            m.put("fullName", r[1]);
            m.put("phone", r[2]);
            m.put("telegramId", r[3]);
            m.put("createdAt", r[4] == null ? null : r[4].toString());
            // roles comes back as a String[] from PostgreSQL array
            Object rolesRaw = r[5];
            List<String> roles;
            if (rolesRaw instanceof String[] arr) {
                roles = List.of(arr);
            } else if (rolesRaw instanceof Object[] arr) {
                roles = java.util.Arrays.stream(arr).map(Object::toString).toList();
            } else {
                roles = List.of();
            }
            m.put("roles", roles);
            return (Map<String, Object>) m;
        }).toList();
    }

    @PostMapping("/{userId}/roles")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Replace all roles for a user")
    public void setRoles(@PathVariable UUID userId,
                         @RequestBody List<String> roles) {
        userRepo.findById(userId)
                .orElseThrow(() -> DomainException.notFound("User", userId));

        for (String role : roles) {
            if (!VALID_ROLES.contains(role)) {
                throw new DomainException("user.invalid_role",
                        "Invalid role: " + role + ". Valid: " + VALID_ROLES,
                        HttpStatus.BAD_REQUEST);
            }
        }

        em.createNativeQuery("DELETE FROM app.user_role WHERE user_id = :id")
                .setParameter("id", userId)
                .executeUpdate();

        UUID orgId = firstOrgId();
        for (String role : roles) {
            em.createNativeQuery("""
                    INSERT INTO app.user_role (user_id, organization_id, role)
                    VALUES (:uid, :oid, :role)
                    ON CONFLICT DO NOTHING
                    """)
                    .setParameter("uid", userId)
                    .setParameter("oid", orgId)
                    .setParameter("role", role)
                    .executeUpdate();
        }
    }

    @PostMapping("/{userId}/roles/add")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Add a single role to a user")
    public void addRole(@PathVariable UUID userId,
                        @RequestParam String role) {
        userRepo.findById(userId)
                .orElseThrow(() -> DomainException.notFound("User", userId));
        if (!VALID_ROLES.contains(role)) {
            throw new DomainException("user.invalid_role",
                    "Invalid role: " + role + ". Valid: " + VALID_ROLES,
                    HttpStatus.BAD_REQUEST);
        }
        UUID orgId = firstOrgId();
        em.createNativeQuery("""
                INSERT INTO app.user_role (user_id, organization_id, role)
                VALUES (:uid, :oid, :role)
                ON CONFLICT DO NOTHING
                """)
                .setParameter("uid", userId)
                .setParameter("oid", orgId)
                .setParameter("role", role)
                .executeUpdate();
    }

    @DeleteMapping("/{userId}/roles/{role}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a role from a user")
    public void removeRole(@PathVariable UUID userId,
                           @PathVariable String role) {
        em.createNativeQuery(
                "DELETE FROM app.user_role WHERE user_id = :uid AND role = :role")
                .setParameter("uid", userId)
                .setParameter("role", role)
                .executeUpdate();
    }

    private UUID firstOrgId() {
        Object id = em.createNativeQuery("SELECT id FROM app.organization ORDER BY created_at LIMIT 1")
                .getSingleResult();
        return (UUID) id;
    }
}
