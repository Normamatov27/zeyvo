package com.zeyvo.auth.service;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.web.client.RestClient;

@Service
@Slf4j
public class TelegramBotService {

    private final String botToken;
    private final boolean usePolling;
    private final RestClient http;
    private final UserAccountRepository userRepo;
    private final AtomicLong lastUpdateId = new AtomicLong(-1);

    @PersistenceContext
    private EntityManager em;
    private final SecureRandom random = new SecureRandom();

    /** link code → (userId, expiresAt) — expires after 10 minutes */
    private final ConcurrentHashMap<String, LinkEntry> linkCodes = new ConcurrentHashMap<>();

    private record LinkEntry(UUID userId, Instant expiresAt) {}

    /** web login: code → telegramId (null = pending, set when bot confirms) */
    private final ConcurrentHashMap<String, WebLoginEntry> webLoginCodes = new ConcurrentHashMap<>();

    private record WebLoginEntry(Long telegramId, Instant expiresAt) {}

    public String createWebLoginCode() {
        String code = randomCode();
        webLoginCodes.put(code, new WebLoginEntry(null, Instant.now().plusSeconds(300)));
        return code;
    }

    /**
     * Returns:
     *  -1L  → not found / expired
     *   0L  → code is valid but bot hasn't confirmed yet (pending)
     *  >0L  → confirmed telegram_id
     */
    public long pollWebLoginCode(String code) {
        WebLoginEntry e = webLoginCodes.get(code);
        if (e == null || Instant.now().isAfter(e.expiresAt())) {
            webLoginCodes.remove(code);
            return -1L;
        }
        Long tid = e.telegramId();
        return tid == null ? 0L : tid;
    }

    public void consumeWebLoginCode(String code) {
        webLoginCodes.remove(code);
    }

    /** Dev-only: directly confirm a pending web login code without a real bot. */
    public boolean confirmWebLoginCode(String code, long telegramId) {
        WebLoginEntry e = webLoginCodes.get(code);
        if (e == null || Instant.now().isAfter(e.expiresAt())) {
            webLoginCodes.remove(code);
            return false;
        }
        webLoginCodes.put(code, new WebLoginEntry(telegramId, e.expiresAt()));
        log.info("[DEV] Web login code {} confirmed with fake telegram_id={}", code, telegramId);
        return true;
    }

    private static final String WELCOME_EXISTING =
            "👋 Xush kelibsiz! Navbat olish uchun veb-saytga kiring yoki zeyvo ilovasini oching.";

    private static final String WELCOME_NEW =
            "👋 Salom! Men *zeyvo* botiman — navbat boshqaruv tizimi.\n\n" +
            "Davom etish uchun telefon raqamingizni ulashing 👇";

    public TelegramBotService(
            @Value("${zeyvo.telegram.bot-token:}") String botToken,
            @Value("${zeyvo.telegram.use-polling:false}") boolean usePolling,
            UserAccountRepository userRepo
    ) {
        this.botToken = botToken;
        this.usePolling = usePolling;
        this.userRepo = userRepo;
        this.http = RestClient.builder()
                .baseUrl("https://api.telegram.org")
                .build();
    }

    /** Generate a link code for the given user (valid 10 min). */
    public String generateLinkCode(UUID userId) {
        String code = randomCode();
        linkCodes.put(code, new LinkEntry(userId, Instant.now().plusSeconds(600)));
        log.debug("Generated Telegram link code for user {}: {}", userId, code);
        return code;
    }

    /** Send an OTP code to a user's Telegram chat. */
    public void sendOtp(long telegramId, String code) {
        if (botToken.isBlank()) {
            log.warn("[DEV] Telegram OTP for chat_id={}: {}", telegramId, code);
            return;
        }
        String text = "🔐 *" + code + "* — zeyvo tasdiqlash kodi.\n\nHech kimga bermang. 5 daqiqa amal qiladi.";
        sendMessage(telegramId, text);
    }

    /** Poll Telegram for new messages every 4 seconds. Only active when use-polling=true (dev/local). */
    @Scheduled(fixedDelay = 4_000)
    public void pollUpdates() {
        if (!usePolling || botToken.isBlank()) return;
        try {
            long offset = lastUpdateId.get() + 1;
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = http.get()
                    .uri("/bot{token}/getUpdates?offset={offset}&timeout=2", botToken, offset)
                    .retrieve()
                    .body(Map.class);

            if (resp == null || !Boolean.TRUE.equals(resp.get("ok"))) return;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> updates = (List<Map<String, Object>>) resp.get("result");
            if (updates == null || updates.isEmpty()) return;

            for (Map<String, Object> update : updates) {
                long updateId = ((Number) update.get("update_id")).longValue();
                lastUpdateId.set(updateId);

                @SuppressWarnings("unchecked")
                Map<String, Object> message = (Map<String, Object>) update.get("message");
                if (message == null) continue;

                @SuppressWarnings("unchecked")
                Map<String, Object> chat = (Map<String, Object>) message.get("chat");
                long chatId = ((Number) chat.get("id")).longValue();

                // Contact shared (phone number)
                @SuppressWarnings("unchecked")
                Map<String, Object> contact = (Map<String, Object>) message.get("contact");
                if (contact != null) {
                    handleContact(chatId, contact);
                    continue;
                }

                String text = (String) message.get("text");
                if (text == null) continue;

                String trimmed = text.trim();
                if (trimmed.startsWith("/start")) {
                    String param = trimmed.length() > 7 ? trimmed.substring(7).trim() : "";
                    handleStart(chatId, param);
                } else if (trimmed.startsWith("/status")) {
                    handleStatusCmd(chatId, chatId); // for DMs chatId == telegramUserId
                } else if (trimmed.startsWith("/cancel")) {
                    handleCancelCmd(chatId, chatId);
                } else if (trimmed.matches("[A-Z2-9]{8}") && webLoginCodes.containsKey(trimmed)) {
                    // User typed the 8-char code directly instead of clicking the link
                    handleStart(chatId, "weblogin_" + trimmed);
                }
            }
        } catch (Exception e) {
            log.debug("Telegram poll error: {}", e.getMessage());
        }
    }

    @Transactional
    public void handleStart(long chatId, String startParam) {
        if (!startParam.isEmpty()) {
            // Web login flow: /start weblogin_XXXXXXXX
            if (startParam.startsWith("weblogin_")) {
                String webCode = startParam.substring("weblogin_".length());
                WebLoginEntry e = webLoginCodes.get(webCode);
                if (e != null && Instant.now().isBefore(e.expiresAt())) {
                    webLoginCodes.put(webCode, new WebLoginEntry(chatId, e.expiresAt()));
                    sendMessage(chatId, "✅ *Tasdiqlandi!* Brauzeringizga qayting — tizimga kirishingiz tayyor.");
                    log.info("Web login code {} confirmed by telegram_id={}", webCode, chatId);
                    return;
                }
                sendMessage(chatId, "⚠️ Kirish kodi topilmadi yoki muddati tugagan. Qaytadan urinib ko'ring.");
                return;
            }

            // Account link flow: /start XXXXXXXX
            LinkEntry entry = linkCodes.get(startParam);
            if (entry != null && Instant.now().isBefore(entry.expiresAt())) {
                linkCodes.remove(startParam);
                UserAccount user = userRepo.findById(entry.userId()).orElse(null);
                if (user != null) {
                    user.setTelegramId(chatId);
                    userRepo.save(user);
                    sendMessage(chatId,
                            "✅ *Hisobingiz ulandi!*\n\n" +
                            "Endi navbat yangiliklari Telegram orqali keladi.");
                    log.info("Linked telegram_id={} to user={}", chatId, entry.userId());
                    return;
                }
            }
        }
        // Default /start — check if first time
        UserAccount existing = userRepo.findByTelegramId(chatId).orElse(null);
        if (existing != null) {
            sendMessage(chatId, WELCOME_EXISTING);
        } else {
            sendContactRequest(chatId);
        }
    }

    @Transactional(readOnly = true)
    public void handleStatusCmd(long chatId, long telegramUserId) {
        try {
            Object[] row = (Object[]) em.createNativeQuery("""
                    SELECT t.number, t.status,
                           (SELECT COUNT(*) FROM app.ticket t2
                            WHERE t2.branch_id = t.branch_id AND t2.status = 'waiting'
                              AND t2.joined_at < t.joined_at) AS position,
                           b.name, s.name, wd.number
                    FROM app.ticket t
                    JOIN app.branch b ON b.id = t.branch_id
                    JOIN app.service s ON s.id = t.service_id
                    LEFT JOIN app.window_desk wd ON wd.id = t.window_id
                    JOIN app.user_account ua ON ua.id = t.customer_id
                    WHERE ua.telegram_id = :tid
                      AND t.status IN ('waiting','called','serving')
                    ORDER BY t.joined_at DESC LIMIT 1
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
            sendMessage(chatId, "🎫 *" + number + "* — " + branchName + "\n_" + serviceName + "_\n\n" + statusLine);
        } catch (NoResultException e) {
            sendMessage(chatId, "You don't have an active ticket. Open zeyvo to join a queue.");
        } catch (Exception e) {
            log.warn("Status cmd failed for telegramId={}: {}", telegramUserId, e.getMessage());
        }
    }

    @Transactional
    public void handleCancelCmd(long chatId, long telegramUserId) {
        try {
            int updated = em.createNativeQuery("""
                    UPDATE app.ticket SET status = 'cancelled', closed_at = now()
                    WHERE id = (
                        SELECT t.id FROM app.ticket t
                        JOIN app.user_account ua ON ua.id = t.customer_id
                        WHERE ua.telegram_id = :tid AND t.status IN ('waiting','called')
                        ORDER BY t.joined_at DESC LIMIT 1
                    )
                    """)
                .setParameter("tid", telegramUserId)
                .executeUpdate();
            sendMessage(chatId, updated > 0 ? "✅ Your ticket has been cancelled." : "No active ticket to cancel.");
        } catch (Exception e) {
            log.warn("Cancel cmd failed for telegramId={}: {}", telegramUserId, e.getMessage());
            sendMessage(chatId, "Failed to cancel. Please try again.");
        }
    }

    @Transactional
    public void handleContact(long chatId, Map<String, Object> contact) {
        // Only accept contact from the same user (Telegram guarantees this for keyboard buttons)
        Long fromId = contact.get("user_id") != null ? ((Number) contact.get("user_id")).longValue() : null;
        if (fromId != null && fromId != chatId) return; // contact shared for someone else — ignore

        String phone = (String) contact.get("phone_number");
        if (phone == null || phone.isBlank()) return;

        // Normalise: ensure it starts with +
        if (!phone.startsWith("+")) phone = "+" + phone;

        // Find by telegram_id first
        UserAccount user = userRepo.findByTelegramId(chatId).orElse(null);
        if (user == null) {
            // May already have account by phone (e.g., OTP login) — link them
            user = userRepo.findByPhone(phone).orElse(null);
        }

        if (user == null) {
            // Brand new user
            String firstName = (String) contact.getOrDefault("first_name", "");
            String lastName  = (String) contact.get("last_name");
            String fullName  = (firstName + (lastName != null ? " " + lastName : "")).strip();
            user = UserAccount.builder()
                    .telegramId(chatId)
                    .phone(phone)
                    .fullName(fullName.isBlank() ? null : fullName)
                    .locale("uz")
                    .build();
            userRepo.save(user);
            log.info("New user via bot contact: telegram_id={}, phone={}", chatId, phone);
        } else {
            // Update existing user
            if (user.getTelegramId() == null) user.setTelegramId(chatId);
            if (user.getPhone() == null)      user.setPhone(phone);
            userRepo.save(user);
            log.info("Linked contact to existing user={}: telegram_id={}, phone={}", user.getId(), chatId, phone);
        }

        removeContactKeyboard(chatId,
                "✅ *Telefon raqamingiz saqlandi!*\n\n" +
                "Endi zeyvo orqali navbat olishingiz mumkin.");
    }

    private void sendContactRequest(long chatId) {
        try {
            Map<String, Object> button = Map.of(
                    "text", "📱 Telefon raqamini ulashish",
                    "request_contact", true
            );
            Map<String, Object> keyboard = Map.of(
                    "keyboard", List.of(List.of(button)),
                    "resize_keyboard", true,
                    "one_time_keyboard", true
            );
            http.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", WELCOME_NEW,
                            "parse_mode", "Markdown",
                            "reply_markup", keyboard
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to send contact request to {}: {}", chatId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void removeContactKeyboard(long chatId, String text) {
        try {
            http.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", text,
                            "parse_mode", "Markdown",
                            "reply_markup", Map.of("remove_keyboard", true)
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to remove keyboard for {}: {}", chatId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void sendMessage(long chatId, String text) {
        try {
            http.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("chat_id", chatId, "text", text, "parse_mode", "Markdown"))
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Failed to send Telegram message to {}: {}", chatId, e.getMessage());
        }
    }

    private String randomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }
}
