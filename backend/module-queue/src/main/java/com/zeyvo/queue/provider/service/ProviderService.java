package com.zeyvo.queue.provider.service;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.queue.provider.api.dto.CreateProviderRequest;
import com.zeyvo.queue.provider.api.dto.ProviderDto;
import com.zeyvo.queue.provider.api.dto.ScheduleSlotDto;
import com.zeyvo.queue.provider.domain.Provider;
import com.zeyvo.queue.provider.infra.ProviderRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProviderService {

    private final ProviderRepository repo;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public List<ProviderDto> listForBranch(UUID branchId) {
        return repo.findActiveByBranchId(branchId).stream()
                .map(p -> enrich(p))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProviderDto> listForOrg(UUID orgId) {
        return repo.findByOrganizationIdAndActiveTrue(orgId).stream()
                .map(p -> enrich(p))
                .toList();
    }

    @Transactional
    public ProviderDto create(CreateProviderRequest req, UUID orgId) {
        Provider provider = Provider.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .fullName(req.fullName())
                .specialty(req.specialty())
                .bio(req.bio())
                .avatarUrl(req.avatarUrl())
                .active(true)
                .createdAt(Instant.now())
                .build();
        repo.save(provider);

        if (req.branchIds() != null) {
            for (UUID branchId : req.branchIds()) {
                em.createNativeQuery(
                        "INSERT INTO app.provider_branch (provider_id, branch_id) VALUES (:pid, :bid) ON CONFLICT DO NOTHING")
                        .setParameter("pid", provider.getId())
                        .setParameter("bid", branchId)
                        .executeUpdate();
            }
        }

        return enrich(provider);
    }

    @Transactional
    public ProviderDto update(UUID id, CreateProviderRequest req) {
        Provider provider = repo.findById(id)
                .orElseThrow(() -> new DomainException("provider.not_found", "Provider not found", HttpStatus.NOT_FOUND));
        if (req.fullName() != null) provider.setFullName(req.fullName());
        if (req.specialty() != null) provider.setSpecialty(req.specialty());
        if (req.bio() != null) provider.setBio(req.bio());
        if (req.avatarUrl() != null) provider.setAvatarUrl(req.avatarUrl());

        if (req.branchIds() != null) {
            em.createNativeQuery("DELETE FROM app.provider_branch WHERE provider_id = :pid")
                    .setParameter("pid", id)
                    .executeUpdate();
            for (UUID branchId : req.branchIds()) {
                em.createNativeQuery(
                        "INSERT INTO app.provider_branch (provider_id, branch_id) VALUES (:pid, :bid) ON CONFLICT DO NOTHING")
                        .setParameter("pid", id)
                        .setParameter("bid", branchId)
                        .executeUpdate();
            }
        }

        return enrich(provider);
    }

    @Transactional
    public void deactivate(UUID id) {
        Provider provider = repo.findById(id)
                .orElseThrow(() -> new DomainException("provider.not_found", "Provider not found", HttpStatus.NOT_FOUND));
        provider.setActive(false);
    }

    @Transactional(readOnly = true)
    public List<ScheduleSlotDto> getSchedule(UUID providerId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT branch_id, day_of_week, start_time, end_time, slot_duration_min " +
                "FROM app.provider_schedule WHERE provider_id = :pid ORDER BY branch_id, day_of_week")
                .setParameter("pid", providerId)
                .getResultList();

        List<ScheduleSlotDto> slots = new ArrayList<>();
        for (Object[] r : rows) {
            slots.add(new ScheduleSlotDto(
                    (UUID) r[0],
                    ((Number) r[1]).intValue(),
                    r[2].toString(),
                    r[3].toString(),
                    ((Number) r[4]).intValue()
            ));
        }
        return slots;
    }

    @Transactional
    public List<ScheduleSlotDto> upsertSchedule(UUID providerId, List<ScheduleSlotDto> slots) {
        repo.findById(providerId)
                .orElseThrow(() -> new DomainException("provider.not_found", "Provider not found", HttpStatus.NOT_FOUND));

        for (ScheduleSlotDto slot : slots) {
            em.createNativeQuery("""
                    INSERT INTO app.provider_schedule
                        (id, provider_id, branch_id, day_of_week, start_time, end_time, slot_duration_min)
                    VALUES (gen_random_uuid(), :pid, :bid, :dow, :st::time, :et::time, :dur)
                    ON CONFLICT (provider_id, branch_id, day_of_week)
                    DO UPDATE SET start_time = EXCLUDED.start_time,
                                  end_time   = EXCLUDED.end_time,
                                  slot_duration_min = EXCLUDED.slot_duration_min
                    """)
                    .setParameter("pid", providerId)
                    .setParameter("bid", slot.branchId())
                    .setParameter("dow", slot.dayOfWeek())
                    .setParameter("st", slot.startTime())
                    .setParameter("et", slot.endTime())
                    .setParameter("dur", slot.slotDurationMin())
                    .executeUpdate();
        }
        return getSchedule(providerId);
    }

    @SuppressWarnings("unchecked")
    private ProviderDto enrich(Provider p) {
        List<Object> rawBranches = em.createNativeQuery(
                "SELECT branch_id FROM app.provider_branch WHERE provider_id = :pid")
                .setParameter("pid", p.getId())
                .getResultList();
        List<UUID> branchIds = rawBranches.stream()
                .map(o -> (UUID) o)
                .toList();

        List<ScheduleSlotDto> schedule = getSchedule(p.getId());
        return ProviderDto.withBranches(p, branchIds, schedule);
    }
}
