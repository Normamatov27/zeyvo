package com.zeyvo.auth.infra.repository;

import com.zeyvo.auth.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByTelegramId(Long telegramId);

    Optional<UserAccount> findByPhone(String phone);

    Optional<UserAccount> findByEmail(String email);

    @Query(value = "SELECT role FROM app.user_role WHERE user_id = :userId", nativeQuery = true)
    List<String> findRolesByUserId(@Param("userId") UUID userId);

    @Query(value = "SELECT organization_id FROM app.user_role WHERE user_id = :userId AND role NOT IN ('customer', 'super_admin') AND organization_id IS NOT NULL LIMIT 1", nativeQuery = true)
    Optional<UUID> findOrgIdByUserId(@Param("userId") UUID userId);
}
