package com.zeyvo.tenant.infra;

import com.zeyvo.tenant.domain.WindowDesk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface WindowDeskRepository extends JpaRepository<WindowDesk, UUID> {
    List<WindowDesk> findByBranchIdOrderByNumberAsc(UUID branchId);

    @Query("SELECT COUNT(w) FROM WindowDesk w WHERE w.branchId = :branchId AND w.status = 'open'")
    int countOpenByBranch(UUID branchId);
}
