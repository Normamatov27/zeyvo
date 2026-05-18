package com.zeyvo.tenant.infra;

import com.zeyvo.tenant.domain.QueueService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QueueServiceRepository extends JpaRepository<QueueService, UUID> {
    List<QueueService> findByBranchIdAndActiveTrueOrderByDisplayOrderAsc(UUID branchId);
    java.util.Optional<QueueService> findByBranchIdAndCode(UUID branchId, String code);
}
