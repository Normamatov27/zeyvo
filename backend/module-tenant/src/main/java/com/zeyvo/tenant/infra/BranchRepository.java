package com.zeyvo.tenant.infra;

import com.zeyvo.tenant.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findByOrganizationIdAndActiveTrue(UUID organizationId);
    Optional<Branch> findByOrganizationIdAndSlug(UUID organizationId, String slug);
    List<Branch> findByActiveTrue();
    long countByOrganizationId(UUID organizationId);
}
