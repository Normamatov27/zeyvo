package com.zeyvo.auth.infra.repository;

import com.zeyvo.auth.domain.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpRepository extends JpaRepository<Otp, UUID> {

    @Query("""
        SELECT o FROM Otp o
        WHERE o.phone = :phone
          AND o.usedAt IS NULL
          AND o.expiresAt > :now
          AND o.attempts < 5
        ORDER BY o.createdAt DESC
        LIMIT 1
        """)
    Optional<Otp> findLatestValid(String phone, Instant now);

    // How many OTPs requested in last hour (rate limiting)
    @Query("SELECT COUNT(o) FROM Otp o WHERE o.phone = :phone AND o.createdAt > :since")
    long countByPhoneSince(String phone, Instant since);
}
