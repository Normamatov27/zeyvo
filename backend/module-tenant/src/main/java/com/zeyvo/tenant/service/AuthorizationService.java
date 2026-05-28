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

    /**
     * Appointment → branch → organization_id.
     * Only the appointment's owning org or SUPER_ADMIN may mutate/read it.
     */
    public void requireAppointmentInOrg(AuthPrincipal user, UUID appointmentId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID org = (UUID) em.createNativeQuery(
                    "SELECT b.organization_id FROM app.appointment a " +
                    "JOIN app.branch b ON b.id = a.branch_id WHERE a.id = :aid")
                .setParameter("aid", appointmentId)
                .getSingleResult();
            if (callerOrg.equals(org)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Appointment not in your organization.");
    }

    /**
     * Device → branch → organization_id.
     * Only the device's owning org or SUPER_ADMIN may manage it.
     */
    public void requireDeviceInOrg(AuthPrincipal user, UUID deviceId) {
        if (user.isSuperAdmin()) return;
        UUID callerOrg = requireOrgId(user);
        try {
            UUID org = (UUID) em.createNativeQuery(
                    "SELECT b.organization_id FROM app.device d " +
                    "JOIN app.branch b ON b.id = d.branch_id WHERE d.id = :did")
                .setParameter("did", deviceId)
                .getSingleResult();
            if (callerOrg.equals(org)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Device not in your organization.");
    }

    /**
     * Chat conversation access:
     *   type=support → only SUPER_ADMIN
     *   type=org     → SUPER_ADMIN, or org admin/manager whose orgId matches conv.org_id
     * Returns the conversation's orgId (or null for support convs) after verification.
     */
    public UUID requireConversationAccess(AuthPrincipal user, UUID convId) {
        Object[] row;
        try {
            row = (Object[]) em.createNativeQuery(
                    "SELECT type, org_id FROM app.chat_conversation WHERE id = :cid")
                .setParameter("cid", convId)
                .getSingleResult();
        } catch (NoResultException e) {
            throw DomainException.notFound("Conversation", convId);
        }
        String type  = (String) row[0];
        UUID   orgId = row[1] != null ? (UUID) row[1] : null;

        if ("support".equals(type)) {
            if (!user.isSuperAdmin()) throw DomainException.forbidden("Only super-admins may access support conversations.");
            return null;
        }
        // org conversation
        if (user.isSuperAdmin()) return orgId;
        UUID callerOrg = requireOrgId(user);
        if (!callerOrg.equals(orgId)) throw DomainException.forbidden("Conversation not in your organization.");
        return orgId;
    }

    /**
     * Verifies that the target window belongs to the same branch as expectedBranchId.
     * Used by ticket transfer to prevent cross-branch window assignment.
     */
    public void requireWindowInBranch(UUID windowId, UUID expectedBranchId) {
        try {
            UUID branchId = (UUID) em.createNativeQuery(
                    "SELECT branch_id FROM app.window_desk WHERE id = :wid")
                .setParameter("wid", windowId)
                .getSingleResult();
            if (expectedBranchId.equals(branchId)) return;
        } catch (NoResultException ignored) {}
        throw DomainException.forbidden("Target window is not in the ticket's branch.");
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
