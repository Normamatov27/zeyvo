package com.zeyvo.tenant.service;

import com.zeyvo.common.web.AuthPrincipal;
import com.zeyvo.common.web.DomainException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Single source of truth for tenant ownership checks.
 * Replaces the copy-pasted requireXOrg methods scattered across controllers.
 * SUPER_ADMIN bypasses every check.
 */
@Service
public class AuthorizationService {

    @PersistenceContext
    private EntityManager em;

    public void requireBranchInOrg(AuthPrincipal user, UUID branchId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID branchOrg = (UUID) em.createNativeQuery(
                    "SELECT organization_id FROM app.branch WHERE id = :bid")
                .setParameter("bid", branchId)
                .getSingleResult();
            if (callerOrg.equals(branchOrg)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Branch not in your organization.");
    }

    public void requireWindowInOrg(AuthPrincipal user, UUID windowId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID org = (UUID) em.createNativeQuery(
                    "SELECT b.organization_id FROM app.window_desk w " +
                    "JOIN app.branch b ON b.id = w.branch_id WHERE w.id = :wid")
                .setParameter("wid", windowId)
                .getSingleResult();
            if (callerOrg.equals(org)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Window not in your organization.");
    }

    public void requireServiceInOrg(AuthPrincipal user, UUID serviceId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID org = (UUID) em.createNativeQuery(
                    "SELECT b.organization_id FROM app.service s " +
                    "JOIN app.branch b ON b.id = s.branch_id WHERE s.id = :sid")
                .setParameter("sid", serviceId)
                .getSingleResult();
            if (callerOrg.equals(org)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Service not in your organization.");
    }

    public void requireProviderInOrg(AuthPrincipal user, UUID providerId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID org = (UUID) em.createNativeQuery(
                    "SELECT organization_id FROM app.provider WHERE id = :pid")
                .setParameter("pid", providerId)
                .getSingleResult();
            if (callerOrg.equals(org)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Provider not in your organization.");
    }

    /** Extracts orgId — throws 403 FORBIDDEN if the caller has no org (e.g. super-admin without org). */
    public UUID requireOrgId(AuthPrincipal user) {
        UUID orgId = user.orgId();
        if (orgId == null) {
            throw new DomainException("auth.no_organization",
                    "Your account is not linked to any organization. Contact support.",
                    HttpStatus.FORBIDDEN);
        }
        return orgId;
    }
}
