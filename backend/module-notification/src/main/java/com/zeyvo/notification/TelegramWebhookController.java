package com.zeyvo.notification;

import com.zeyvo.queue.service.TicketService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Receives incoming Telegram updates via webhook.
 * Handles: /start → mini app launch button; /status → current ticket info; /cancel → cancel ticket.
 */
@RestController
@RequestMapping("/v1/integrations/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramNotificationService telegram;
    private final TicketService ticketService;

    @PersistenceContext
    private EntityManager em;

    @Value("${zeyvo.telegram.webhook-secret:}")
    private String webhookSecret;

    @Value("${zeyvo.telegram.bot-username:zeyvo_bot}")
    private String botUsername;

    /**
     * Call once after deploy to register our webhook URL with Telegram.
     * Requires SUPER_ADMIN role — prevents bot takeover via unauthenticated call.
     */
    @PostMapping("/register-webhook")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> registerWebhook(@RequestParam String url) {
        if (!telegram.isEnabled()) return ResponseEntity.badRequest().body("Bot token not configured");
        String webhookUrl = url + "/api/v1/integrations/telegram/webhook";
        try {
            // Build RestClient on the fly — same base URL as TelegramNotificationService
            var client = org.springframework.web.client.RestClient.builder()
                    .baseUrl("https://api.telegram.org")
                    .build();
            String token = telegram.getBotToken();
            client.post()
                    .uri("/bot{token}/setWebhook", token)
                    .body(java.util.Map.of(
                            "url", webhookUrl,
                            "secret_token", webhookSecret.isBlank() ? "" : webhookSecret,
                            "allowed_updates", new String[] {"message"}
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return ResponseEntity.ok("Webhook registered: " + webhookUrl);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed: " + e.getMessage());
        }
    }

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<Void> webhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody Map<String, Object> update) {

        // Always verify secret — if not configured, reject all requests (fail-secure)
        if (webhookSecret.isBlank() || !constantTimeEquals(webhookSecret, secret == null ? "" : secret)) {
            log.warn("Telegram webhook: invalid or missing secret token");
            return ResponseEntity.status(403).build();
        }

        try {
            handleUpdate(update);
        } catch (Exception e) {
            log.error("Telegram webhook handler error: {}", e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private void handleUpdate(Map<String, Object> update) {
        Map<String, Object> message = (Map<String, Object>) update.get("message");
        if (message == null) return;

        Map<String, Object> from = (Map<String, Object>) message.get("from");
        if (from == null) return;

        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        if (chat == null) return;
        long chatId = ((Number) chat.get("id")).longValue();

        String text = (String) message.getOrDefault("text", "");
        Long telegramUserId = ((Number) from.get("id")).longValue();

        if (text.startsWith("/start")) {
            handleStart(chatId, telegramUserId, from);
        } else if (text.startsWith("/status")) {
            handleStatus(chatId, telegramUserId);
        } else if (text.startsWith("/cancel")) {
            handleCancelCmd(chatId, telegramUserId);
        } else {
            sendText(chatId, "Use /status to check your queue position or open the app below.");
        }
    }

    private void handleStart(long chatId, long telegramUserId, Map<String, Object> from) {
        String firstName = (String) from.getOrDefault("first_name", "there");
        String welcomeText = "👋 Hi *" + firstName + "*! I'm your zeyvo queue assistant.\n\n" +
                "• Open the app to join a queue\n" +
                "• Send /status to check your current position\n" +
                "• Send /cancel to cancel your active ticket";

        telegram.sendWithInlineKeyboard(chatId, welcomeText,
                "Open zeyvo", "https://t.me/" + botUsername + "/app");
    }

    private void handleStatus(long chatId, long telegramUserId) {
        try {
            Object[] row = (Object[]) em.createNativeQuery("""
                SELECT t.number, t.status,
                       (SELECT COUNT(*) FROM app.ticket t2
                        WHERE t2.branch_id = t.branch_id AND t2.status = 'waiting'
                          AND t2.joined_at < t.joined_at) as position,
                       b.name as branch_name,
                       s.name as service_name,
                       wd.number as window_num
                FROM app.ticket t
                JOIN app.branch b ON b.id = t.branch_id
                JOIN app.service s ON s.id = t.service_id
                LEFT JOIN app.window_desk wd ON wd.id = t.window_id
                JOIN app.user_account ua ON ua.id = t.customer_id
                WHERE ua.telegram_id = :tid
                  AND t.status IN ('waiting','called','serving')
                ORDER BY t.joined_at DESC
                LIMIT 1
                """)
                .setParameter("tid", telegramUserId)
                .getSingleResult();

            String number = (String) row[0];
            String status = (String) row[1];
            int position = row[2] != null ? ((Number) row[2]).intValue() : 0;
            String branchName = (String) row[3];
            String serviceName = (String) row[4];
            Integer windowNum = row[5] != null ? ((Number) row[5]).intValue() : null;

            String statusLine = switch (status) {
                case "waiting" -> position == 0
                        ? "🟡 You're *next* in line!"
                        : "🟡 *" + position + "* " + (position == 1 ? "person" : "people") + " ahead of you";
                case "called" -> windowNum != null
                        ? "🔔 *Called!* Please go to *Window " + windowNum + "*"
                        : "🔔 *Called!* Please approach the counter";
                case "serving" -> "✅ *You're being served* right now";
                default -> "ℹ Status: " + status;
            };

            sendText(chatId,
                    "🎫 *" + number + "* — " + branchName + "\n" +
                    "_" + serviceName + "_\n\n" +
                    statusLine);

        } catch (NoResultException e) {
            sendText(chatId, "You don't have an active ticket. Open zeyvo to join a queue.");
        }
    }

    private void handleCancelCmd(long chatId, long telegramUserId) {
        try {
            Object[] row = (Object[]) em.createNativeQuery("""
                    SELECT t.id, ua.id FROM app.ticket t
                    JOIN app.user_account ua ON ua.id = t.customer_id
                    WHERE ua.telegram_id = :tid AND t.status IN ('waiting','called')
                    ORDER BY t.joined_at DESC LIMIT 1
                    """)
                .setParameter("tid", telegramUserId)
                .getSingleResult();

            UUID ticketId  = (UUID) row[0];
            UUID customerId = (UUID) row[1];
            ticketService.cancel(ticketId, customerId);
            sendText(chatId, "✅ Your ticket has been cancelled.");
        } catch (NoResultException e) {
            sendText(chatId, "No active ticket to cancel.");
        } catch (Exception e) {
            log.warn("Bot cancel failed for telegramId={}: {}", telegramUserId, e.getMessage());
            sendText(chatId, "Failed to cancel. Please try again.");
        }
    }

    private void sendText(long chatId, String text) {
        telegram.sendRaw(chatId, text);
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] ab = a.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(ab, bb);
    }
}
