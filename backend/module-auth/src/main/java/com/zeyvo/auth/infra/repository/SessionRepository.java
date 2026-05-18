package com.zeyvo.auth.infra.repository;

import com.zeyvo.auth.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    Optional<Session> findByRefreshHash(String refreshHash);

    @Modifying
    @Query("UPDATE Session s SET s.revokedAt = :now WHERE s.userId = :userId AND s.revokedAt IS NULL")
    void revokeAllForUser(UUID userId, Instant now);
}
