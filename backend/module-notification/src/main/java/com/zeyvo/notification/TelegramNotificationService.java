package com.zeyvo.notification;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@Slf4j
public class TelegramNotificationService {

    private static final String BOT_API = "https://api.telegram.org";

    @Value("${zeyvo.telegram.bot-token:}")
    private String botToken;

    private RestClient restClient;
    private boolean enabled;

    @PostConstruct
    void init() {
        if (!botToken.isBlank()) {
            restClient = RestClient.builder()
                    .baseUrl(BOT_API)
                    .build();
            enabled = true;
            log.info("Telegram bot initialized");
        } else {
            enabled = false;
            log.info("Telegram bot not configured — notifications disabled");
        }
    }

    public void sendTicketCreated(long telegramId, String ticketNumber, int ahead, int etaMin) {
        if (!enabled) return;
        String text = "🎫 Ticket *" + ticketNumber + "* confirmed!\n" +
                (ahead == 0
                        ? "You're next — please head over."
                        : ahead + " ticket" + (ahead == 1 ? "" : "s") + " ahead of you, ~" + etaMin + " min wait.");
        send(telegramId, text);
    }

    public void sendTicketCalled(long telegramId, String ticketNumber, int windowNumber) {
        if (!enabled) return;
        String text = "🔔 *" + ticketNumber + "* — it's almost your turn!\n" +
                "Please go to *Window " + windowNumber + "*";
        send(telegramId, text);
    }

    public void sendTicketNearTurn(long telegramId, String ticketNumber, int ahead, int etaMin) {
        if (!enabled) return;
        String text = "⏳ *" + ticketNumber + "* — " + ahead + " ticket" +
                (ahead == 1 ? "" : "s") + " ahead, ~" + etaMin + " min wait";
        send(telegramId, text);
    }

    public void sendTicketExpired(long telegramId, String ticketNumber) {
        if (!enabled) return;
        String text = "ℹ️ Ticket *" + ticketNumber + "* has expired — your waiting time exceeded the limit.\n" +
                "Please visit the branch again to get a new ticket.";
        send(telegramId, text);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getBotToken() {
        return botToken;
    }

    public void sendRaw(long chatId, String text) {
        send(chatId, text);
    }

    public void sendWithInlineKeyboard(long chatId, String text, String buttonLabel, String url) {
        if (!enabled) return;
        try {
            Map<String, Object> keyboard = Map.of(
                    "inline_keyboard", new Object[][] {
                            new Object[] { Map.of("text", buttonLabel, "url", url) }
                    }
            );
            restClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", text,
                            "parse_mode", "Markdown",
                            "reply_markup", keyboard
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Telegram send error for chatId {}: {}", chatId, e.getMessage());
        }
    }

    /** Send a message with multiple inline button rows. Each button is {text, url}. */
    public void sendWithInlineRows(long chatId, String text, java.util.List<java.util.List<Map<String, String>>> rows) {
        if (!enabled) return;
        try {
            Object[][] kb = new Object[rows.size()][];
            for (int i = 0; i < rows.size(); i++) {
                java.util.List<Map<String, String>> row = rows.get(i);
                Object[] r = new Object[row.size()];
                for (int j = 0; j < row.size(); j++) r[j] = row.get(j);
                kb[i] = r;
            }
            restClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", text,
                            "parse_mode", "Markdown",
                            "reply_markup", Map.of("inline_keyboard", kb)
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Telegram send error for chatId {}: {}", chatId, e.getMessage());
        }
    }

    private void send(long chatId, String text) {
        if (!enabled) return;
        try {
            restClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", text,
                            "parse_mode", "Markdown"
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Telegram send error for chatId {}: {}", chatId, e.getMessage());
        }
    }
}
