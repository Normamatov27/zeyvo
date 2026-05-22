package com.zeyvo.notification;

import com.zeyvo.auth.service.DevSmsService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderJob {

    private final TelegramNotificationService telegram;
    private final DevSmsService sms;

    @PersistenceContext
    private EntityManager em;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM HH:mm")
            .withZone(ZoneId.of("Asia/Tashkent"));

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void sendReminders() {
        Instant windowStart = Instant.now().plusSeconds(23 * 3600);
        Instant windowEnd   = Instant.now().plusSeconds(25 * 3600);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                SELECT a.id, a.customer_id, a.scheduled_at,
                       b.name AS branch_name, s.name AS service_name
                FROM app.appointment a
                JOIN app.branch b ON b.id = a.branch_id
                JOIN app.service s ON s.id = a.service_id
                WHERE a.status IN ('booked','confirmed')
                  AND a.scheduled_at BETWEEN :ws AND :we
                  AND a.reminder_sent_at IS NULL
                LIMIT 100
                """)
                .setParameter("ws", windowStart)
                .setParameter("we", windowEnd)
                .getResultList();

        for (Object[] row : rows) {
            UUID apptId    = (UUID) row[0];
            UUID customerId = (UUID) row[1];
            Instant scheduledAt = ((java.sql.Timestamp) row[2]).toInstant();
            String branchName  = (String) row[3];
            String serviceName = (String) row[4];

            String when = FMT.format(scheduledAt);
            String text = "Reminder: your appointment for " + serviceName + " at " + branchName
                    + " is scheduled for " + when + ".";

            sendToCustomer(customerId, text);

            em.createNativeQuery(
                    "UPDATE app.appointment SET reminder_sent_at = now() WHERE id = :id")
                    .setParameter("id", apptId)
                    .executeUpdate();

            log.info("Reminder sent for appointment {}", apptId);
        }
    }

    private void sendToCustomer(UUID customerId, String text) {
        Object[] userRow;
        try {
            userRow = (Object[]) em.createNativeQuery(
                    "SELECT phone, telegram_id FROM app.user_account WHERE id = :id")
                    .setParameter("id", customerId)
                    .getSingleResult();
        } catch (NoResultException e) {
            return;
        } catch (Exception e) {
            log.error("Failed to look up user {}: {}", customerId, e.getMessage());
            return;
        }

        String phone = (String) userRow[0];
        Object tgIdRaw = userRow[1];

        if (tgIdRaw != null) {
            long tgId = ((Number) tgIdRaw).longValue();
            telegram.sendRaw(tgId, text);
        } else if (phone != null) {
            sms.sendText(phone, text);
        }
    }
}
