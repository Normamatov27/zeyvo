package com.zeyvo.platform.onboarding;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.auth.service.AuthService;
import com.zeyvo.common.web.DomainException;
import com.zeyvo.tenant.domain.Organization;
import com.zeyvo.tenant.infra.OrganizationRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OnboardingService {

    private final OrganizationRepository orgRepo;
    private final UserAccountRepository userRepo;
    private final AuthService authService;

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public OnboardingResponse register(OnboardingRequest req) {
        String slug = (req.orgSlug() != null && !req.orgSlug().isBlank())
                ? req.orgSlug()
                : deriveSlug(req.orgName());

        if (orgRepo.findBySlug(slug).isPresent()) {
            throw new DomainException(
                    "org.slug_taken",
                    "Organization slug already exists. Try a different slug.",
                    HttpStatus.CONFLICT);
        }

        String country = (req.country() != null && !req.country().isBlank())
                ? req.country().toUpperCase() : "UZ";
        String locale = (req.locale() != null && !req.locale().isBlank())
                ? req.locale() : "uz";

        // Create org
        Organization org = Organization.builder()
                .slug(slug)
                .name(req.orgName())
                .country(country)
                .locale(locale)
                .build();
        org = orgRepo.save(org);
        log.info("Onboarded org id={} slug={} name={}", org.getId(), org.getSlug(), org.getName());

        // Find or create user by phone
        UserAccount user = userRepo.findByPhone(req.phone()).orElseGet(() -> {
            UserAccount u = UserAccount.builder()
                    .phone(req.phone())
                    .fullName(req.fullName())
                    .locale(locale)
                    .build();
            return userRepo.save(u);
        });

        // Insert org_admin role (idempotent — composite PK on user/org/role/branch)
        em.createNativeQuery("""
                INSERT INTO app.user_role (user_id, organization_id, role, branch_id)
                VALUES (:uid, :oid, 'org_admin', NULL)
                ON CONFLICT DO NOTHING
                """)
            .setParameter("uid", user.getId())
            .setParameter("oid", org.getId())
            .executeUpdate();

        // Optional first branch
        if (req.firstBranchName() != null && !req.firstBranchName().isBlank()) {
            String branchSlug = deriveSlug(req.firstBranchName());
            em.createNativeQuery("""
                    INSERT INTO app.branch
                      (organization_id, slug, name, type, capacity, active, settings, timezone)
                    VALUES
                      (:oid, :slug, :name, 'custom', 100, true, '{}'::jsonb,
                       CASE WHEN :country = 'UZ' THEN 'Asia/Tashkent' ELSE 'UTC' END)
                    ON CONFLICT DO NOTHING
                    """)
                .setParameter("oid", org.getId())
                .setParameter("slug", branchSlug)
                .setParameter("name", req.firstBranchName())
                .setParameter("country", country)
                .executeUpdate();
            log.info("Onboarded first branch slug={} for org={}", branchSlug, org.getId());
        }

        // Send OTP so the user can verify and immediately log in as org_admin
        authService.requestOtp(req.phone(), "sms");

        return new OnboardingResponse(
                org.getId().toString(),
                org.getSlug(),
                user.getId().toString(),
                "sms",
                300
        );
    }

    private static String deriveSlug(String name) {
        String slug = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > 40) slug = slug.substring(0, 40).replaceAll("-+$", "");
        if (slug.length() < 3) {
            // Guarantee minimum length by suffixing a short hex tag
            slug = (slug + "-" + UUID.randomUUID().toString().substring(0, 6));
        }
        return slug;
    }
}
