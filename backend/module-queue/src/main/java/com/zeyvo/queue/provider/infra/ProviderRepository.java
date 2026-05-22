package com.zeyvo.queue.provider.infra;

import com.zeyvo.queue.provider.domain.Provider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProviderRepository extends JpaRepository<Provider, UUID> {

    List<Provider> findByOrganizationIdAndActiveTrue(UUID organizationId);

    @Query(value = """
            SELECT p.* FROM app.provider p
            JOIN app.provider_branch pb ON pb.provider_id = p.id
            WHERE pb.branch_id = :branchId AND p.active = true
            ORDER BY p.full_name
            """, nativeQuery = true)
    List<Provider> findActiveByBranchId(@Param("branchId") UUID branchId);
}
