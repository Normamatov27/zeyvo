package com.zeyvo.tenant.infra;

import com.zeyvo.tenant.domain.OperatingHours;
import com.zeyvo.tenant.domain.OperatingHoursId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OperatingHoursRepository extends JpaRepository<OperatingHours, OperatingHoursId> {

    List<OperatingHours> findByBranchIdOrderByDayOfWeekAsc(UUID branchId);

    @Modifying
    @Query("DELETE FROM OperatingHours oh WHERE oh.branchId = :branchId")
    void deleteAllByBranchId(UUID branchId);
}
