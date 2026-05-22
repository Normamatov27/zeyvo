package com.zeyvo.notification;

import com.zeyvo.auth.domain.UserAccount;
import com.zeyvo.auth.infra.repository.UserAccountRepository;
import com.zeyvo.auth.service.TelegramBotService;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Receives incoming Telegram updates via webhook and drives an inline-keyboard-only bot.
 *
 *   First contact:  /start  →  language picker (inline)
 *                    pick language  →  phone request (reply keyboard with request_contact)
 *                    share contact  →  main menu (inline)
 *
 *   Returning user: /start  →  main menu (inline)
 *
 *   Main menu actions are all inline callbacks (status / cancel / help) and one web_app
 *   button that opens the mini app at /tg.
 */
@RestController
@RequestMapping("/v1/integrations/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramNotificationService telegram;
    private final TicketService ticketService;
    private final TelegramBotService telegramBotService;
    private final UserAccountRepository userRepo;

    @PersistenceContext
    private EntityManager em;

    @Value("${zeyvo.telegram.webhook-secret:}")
    private String webhookSecret;

    @Value("${zeyvo.telegram.bot-username:zeyvo_bot}")
    private String botUsername;

    @Value("${zeyvo.telegram.mini-app-url:https://zeyvo.tech/tg}")
    private String miniAppUrl;

    // ─── i18n ───────────────────────────────────────────────────────────────────

    private static final Map<String, Map<String, String>> STR = Map.ofEntries(
            Map.entry("welcome_lang", Map.of(
                    "uz", "👋 *zeyvo*-ga xush kelibsiz!\n\nTilni tanlang:",
                    "ru", "👋 Добро пожаловать в *zeyvo*!\n\nВыберите язык:",
                    "en", "👋 Welcome to *zeyvo*!\n\nChoose your language:")),
            Map.entry("ask_phone", Map.of(
                    "uz", "Telefon raqamingizni ulashing — biz sizga navbat haqida xabar yuboramiz.",
                    "ru", "Поделитесь номером телефона — мы будем уведомлять вас о вашей очереди.",
                    "en", "Share your phone number so we can notify you about your queue.")),
            Map.entry("share_phone_btn", Map.of(
                    "uz", "📱 Raqamni ulashish",
                    "ru", "📱 Поделиться номером",
                    "en", "📱 Share my phone")),
            Map.entry("phone_saved", Map.of(
                    "uz", "✅ Raqamingiz saqlandi.",
                    "ru", "✅ Ваш номер сохранён.",
                    "en", "✅ Phone saved.")),
            Map.entry("main_menu", Map.of(
                    "uz", "Sizga qanday yordam bera olaman?",
                    "ru", "Чем могу помочь?",
                    "en", "How can I help?")),
            Map.entry("btn_open_app", Map.of(
                    "uz", "📱 Zeyvo-ni ochish",
                    "ru", "📱 Открыть zeyvo",
                    "en", "📱 Open zeyvo")),
            Map.entry("btn_status", Map.of(
                    "uz", "🎫 Mening navbatim",
                    "ru", "🎫 Моя очередь",
                    "en", "🎫 My queue")),
            Map.entry("btn_cancel", Map.of(
                    "uz", "❌ Navbatni bekor qilish",
                    "ru", "❌ Отменить талон",
                    "en", "❌ Cancel ticket")),
            Map.entry("btn_help", Map.of(
                    "uz", "ℹ️ Yordam",
                    "ru", "ℹ️ Помощь",
                    "en", "ℹ️ Help")),
            Map.entry("btn_back", Map.of(
                    "uz", "« Orqaga",
                    "ru", "« Назад",
                    "en", "« Back")),
            Map.entry("btn_confirm_cancel", Map.of(
                    "uz", "Ha, bekor qilish",
                    "ru", "Да, отменить",
                    "en", "Yes, cancel")),
            Map.entry("no_active_ticket", Map.of(
                    "uz", "Sizda faol navbat yo'q. Navbatga turish uchun ilovani oching.",
                    "ru", "У вас нет активного талона. Откройте приложение, чтобы встать в очередь.",
                    "en", "You don't have an active ticket. Open the app to join a queue.")),
            Map.entry("status_waiting", Map.of(
                    "uz", "🟡 Sizdan oldida {n} kishi",
                    "ru", "🟡 Перед вами {n} человек",
                    "en", "🟡 {n} ahead of you")),
            Map.entry("status_next", Map.of(
                    "uz", "🟡 Siz keyingisiz!",
                    "ru", "🟡 Вы следующий!",
                    "en", "🟡 You're next!")),
            Map.entry("status_called", Map.of(
                    "uz", "🔔 Sizni chaqirishdi! {window} oynaga keling.",
                    "ru", "🔔 Вас вызвали! Подойдите к окну {window}.",
                    "en", "🔔 You've been called! Go to window {window}.")),
            Map.entry("status_called_nowin", Map.of(
                    "uz", "🔔 Sizni chaqirishdi! Hodimga murojaat qiling.",
                    "ru", "🔔 Вас вызвали! Подойдите к стойке.",
                    "en", "🔔 You've been called! Please approach the counter.")),
            Map.entry("status_serving", Map.of(
                    "uz", "✅ Hozir siz xizmat ko'rsatilmoqda.",
                    "ru", "✅ Вас обслуживают сейчас.",
                    "en", "✅ You're being served right now.")),
            Map.entry("confirm_cancel", Map.of(
                    "uz", "Navbatdan haqiqatdan ham chiqmoqchimisiz?",
                    "ru", "Точно отменить талон?",
                    "en", "Are you sure you want to cancel?")),
            Map.entry("cancelled", Map.of(
                    "uz", "✅ Navbat bekor qilindi.",
                    "ru", "✅ Талон отменён.",
                    "en", "✅ Ticket cancelled.")),
            Map.entry("cancel_failed", Map.of(
                    "uz", "Bekor qilib bo'lmadi. Qaytadan urinib ko'ring.",
                    "ru", "Не удалось отменить. Попробуйте ещё раз.",
                    "en", "Couldn't cancel. Please try again.")),
            Map.entry("help_body", Map.of(
                    "uz", "*Zeyvo bot* — bu yerda navbatga turish, holatni ko'rish va bildirishnomalar olish uchun. Quyidagi tugmalardan foydalaning.",
                    "ru", "*Zeyvo бот* — для записи в очередь, проверки статуса и получения уведомлений. Используйте кнопки ниже.",
                    "en", "*Zeyvo bot* — join queues, check status and get push updates. Use the buttons below.")),
            Map.entry("login_confirmed", Map.of(
                    "uz", "✅ Tasdiqlandi! Brauzeringizga qayting.",
                    "ru", "✅ Подтверждено! Вернитесь в браузер.",
                    "en", "✅ Confirmed! Return to your browser.")),
            Map.entry("login_expired", Map.of(
                    "uz", "⚠️ Kirish kodi topilmadi yoki muddati tugagan.",
                    "ru", "⚠️ Код входа не найден или истёк.",
                    "en", "⚠️ Login code not found or expired."))
    );

    private static String s(String key, String locale) {
        Map<String, String> tr = STR.get(key);
        if (tr == null) return key;
        return tr.getOrDefault(locale, tr.getOrDefault("uz", key));
    }

    private static String locale(UserAccount user) {
        if (user == null || user.getLocale() == null) return "uz";
        return user.getLocale();
    }

    // ─── Webhook registration ───────────────────────────────────────────────────

    @PostMapping("/register-webhook")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> registerWebhook(@RequestParam String url) {
        if (!telegram.isEnabled()) return ResponseEntity.badRequest().body("Bot token not configured");
        String webhookUrl = url + "/api/v1/integrations/telegram/webhook";
        try {
            var client = org.springframework.web.client.RestClient.builder()
                    .baseUrl("https://api.telegram.org")
                    .build();
            String token = telegram.getBotToken();
            client.post()
                    .uri("/bot{token}/setWebhook", token)
                    .body(Map.of(
                            "url", webhookUrl,
                            "secret_token", webhookSecret.isBlank() ? "" : webhookSecret,
                            "allowed_updates", new String[] {"message", "callback_query"}
                    ))
                    .retrieve()
                    .toBodilessEntity();

            // Slash commands are intentionally cleared — the bot is inline-keyboard only.
            client.post()
                    .uri("/bot{token}/deleteMyCommands", token)
                    .retrieve()
                    .toBodilessEntity();

            // Persistent menu button → mini app
            client.post()
                    .uri("/bot{token}/setChatMenuButton", token)
                    .body(Map.of(
                            "menu_button", Map.of(
                                    "type", "web_app",
                                    "text", "Open Zeyvo",
                                    "web_app", Map.of("url", miniAppUrl)
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();

            return ResponseEntity.ok("Webhook registered: " + webhookUrl);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed: " + e.getMessage());
        }
    }

    // ─── Webhook entry point ────────────────────────────────────────────────────

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody Map<String, Object> update) {

        if (webhookSecret.isBlank() || !constantTimeEquals(webhookSecret, secret == null ? "" : secret)) {
            log.warn("Telegram webhook: invalid or missing secret token");
            return ResponseEntity.status(403).build();
        }

        try {
            if (update.containsKey("callback_query")) {
                handleCallback((Map<String, Object>) update.get("callback_query"));
            } else if (update.containsKey("message")) {
                handleMessage((Map<String, Object>) update.get("message"));
            }
        } catch (Exception e) {
            log.error("Telegram webhook handler error", e);
        }
        return ResponseEntity.ok().build();
    }

    // ─── Message handler ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void handleMessage(Map<String, Object> message) {
        Map<String, Object> from = (Map<String, Object>) message.get("from");
        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        if (from == null || chat == null) return;

        long chatId = ((Number) chat.get("id")).longValue();
        long tgUserId = ((Number) from.get("id")).longValue();

        // Contact shared via the request_contact reply-keyboard button
        Map<String, Object> contact = (Map<String, Object>) message.get("contact");
        if (contact != null) {
            handleContactShared(chatId, tgUserId, from, contact);
            return;
        }

        String text = (String) message.getOrDefault("text", "");
        String trimmed = text.trim();

        // /start XXXXXXXX is the web-login deep link (browser → telegram → confirm)
        if (trimmed.startsWith("/start")) {
            String param = trimmed.length() > 7 ? trimmed.substring(7).trim() : "";
            if (!param.isEmpty()) {
                handleWebLogin(chatId, tgUserId, param);
                return;
            }
            handleStart(chatId, tgUserId, from);
            return;
        }

        // 8-char web-login code typed without /start
        if (trimmed.matches("[A-Z2-9]{8}")) {
            handleWebLogin(chatId, tgUserId, trimmed);
            return;
        }

        // Anything else: re-show the main menu in the user's locale
        UserAccount user = userRepo.findByTelegramId(tgUserId).orElse(null);
        if (user == null) {
            handleStart(chatId, tgUserId, from);
        } else if (user.getPhone() == null) {
            promptContact(chatId, locale(user));
        } else {
            showMainMenu(chatId, locale(user));
        }
    }

    private void handleWebLogin(long chatId, long tgUserId, String param) {
        String code = param.startsWith("weblogin_") ? param.substring("weblogin_".length()) : param;
        boolean ok = telegramBotService.confirmWebLoginCode(code, tgUserId);
        UserAccount user = userRepo.findByTelegramId(tgUserId).orElse(null);
        String loc = locale(user);
        telegram.sendRaw(chatId, ok ? s("login_confirmed", loc) : s("login_expired", loc));
    }

    private void handleStart(long chatId, long tgUserId, Map<String, Object> from) {
        UserAccount user = userRepo.findByTelegramId(tgUserId).orElse(null);
        if (user == null) {
            // Brand new user — make a stub row immediately so subsequent updates can find them
            String firstName = (String) from.getOrDefault("first_name", "");
            String lastName  = (String) from.get("last_name");
            String fullName  = (firstName + (lastName != null ? " " + lastName : "")).strip();
            user = UserAccount.builder()
                    .telegramId(tgUserId)
                    .fullName(fullName.isBlank() ? null : fullName)
                    .locale("uz")  // default; user will overwrite
                    .build();
            userRepo.save(user);
            promptLanguage(chatId);
            return;
        }
        // Anyone without a phone is still onboarding — re-offer the language picker
        // (the locale field always has a default, so we can't tell whether the user
        //  explicitly chose; force the choice up front).
        if (user.getPhone() == null) {
            promptLanguage(chatId);
            return;
        }
        showMainMenu(chatId, locale(user));
    }

    @SuppressWarnings("unchecked")
    private void handleContactShared(long chatId, long tgUserId, Map<String, Object> from,
                                     Map<String, Object> contact) {
        Long fromContactId = contact.get("user_id") != null
                ? ((Number) contact.get("user_id")).longValue() : null;
        // Telegram guarantees user_id matches the sender for request_contact buttons; defend anyway
        if (fromContactId != null && fromContactId != tgUserId) return;

        String phone = (String) contact.get("phone_number");
        if (phone == null || phone.isBlank()) return;
        if (!phone.startsWith("+")) phone = "+" + phone;

        UserAccount byTg    = userRepo.findByTelegramId(tgUserId).orElse(null);
        UserAccount byPhone = userRepo.findByPhone(phone).orElse(null);
        UserAccount user;

        try {
            if (byPhone != null && byTg != null && !byPhone.getId().equals(byTg.getId())) {
                // Two rows exist (stub from /start + canonical from prior OTP signup).
                // Merge into the phone-canonical row, drop the stub.
                String stubLocale = byTg.getLocale();
                String stubName   = byTg.getFullName();
                userRepo.deleteById(byTg.getId()); // its own tx — releases telegram_id constraint slot
                byPhone.setTelegramId(tgUserId);
                if (byPhone.getFullName() == null && stubName != null) byPhone.setFullName(stubName);
                if (stubLocale != null && !"uz".equals(stubLocale)) byPhone.setLocale(stubLocale);
                user = userRepo.save(byPhone);
            } else if (byPhone != null) {
                // No prior bot row, but the OTP flow already created the account — just link telegram.
                byPhone.setTelegramId(tgUserId);
                user = userRepo.save(byPhone);
            } else if (byTg != null) {
                // Stub from /start with no prior account on this phone — set phone.
                byTg.setPhone(phone);
                user = userRepo.save(byTg);
            } else {
                // Brand new everywhere — defensive fallback (handleStart usually pre-creates).
                String firstName = (String) from.getOrDefault("first_name", "");
                user = userRepo.save(UserAccount.builder()
                        .telegramId(tgUserId)
                        .phone(phone)
                        .fullName(firstName.isBlank() ? null : firstName)
                        .locale("uz")
                        .build());
            }
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Whoever else has this telegram_id or phone wins — try to recover by re-reading.
            final String finalPhone = phone;
            log.warn("Contact-share constraint violation for tg={} phone={}: {}", tgUserId, finalPhone, e.getMessage());
            user = userRepo.findByTelegramId(tgUserId)
                    .or(() -> userRepo.findByPhone(finalPhone))
                    .orElse(null);
            if (user == null) {
                telegram.removeReplyKeyboard(chatId, "⚠️");
                return;
            }
        }

        String loc = locale(user);
        telegram.removeReplyKeyboard(chatId, s("phone_saved", loc));
        showMainMenu(chatId, loc);
    }

    // ─── Callback handler ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void handleCallback(Map<String, Object> cb) {
        String id = (String) cb.get("id");
        telegram.answerCallback(id);

        Map<String, Object> from = (Map<String, Object>) cb.get("from");
        Map<String, Object> message = (Map<String, Object>) cb.get("message");
        if (from == null || message == null) return;
        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        if (chat == null) return;

        long chatId = ((Number) chat.get("id")).longValue();
        long tgUserId = ((Number) from.get("id")).longValue();
        String data = (String) cb.get("data");
        if (data == null) return;

        if (data.startsWith("lang:")) {
            String newLocale = data.substring(5);
            if (!List.of("uz", "ru", "en").contains(newLocale)) return;
            UserAccount user = userRepo.findByTelegramId(tgUserId).orElse(null);
            if (user == null) {
                user = UserAccount.builder().telegramId(tgUserId).locale(newLocale).build();
            } else {
                user.setLocale(newLocale);
            }
            userRepo.save(user);
            // Next step in onboarding: phone share (or, if already shared, main menu)
            if (user.getPhone() == null) promptContact(chatId, newLocale);
            else showMainMenu(chatId, newLocale);
            return;
        }

        UserAccount user = userRepo.findByTelegramId(tgUserId).orElse(null);
        String loc = locale(user);

        switch (data) {
            case "menu"   -> showMainMenu(chatId, loc);
            case "status" -> handleStatus(chatId, tgUserId, loc);
            case "cancel" -> handleCancelPrompt(chatId, loc);
            case "cancel:confirm" -> handleCancelConfirm(chatId, tgUserId, loc);
            case "help"   -> handleHelp(chatId, loc);
            default -> log.debug("Unknown callback data: {}", data);
        }
    }

    // ─── Prompts / menus ────────────────────────────────────────────────────────

    private void promptLanguage(long chatId) {
        telegram.sendWithInlineRows(chatId, s("welcome_lang", "uz") + "\n" +
                        s("welcome_lang", "ru") + "\n" + s("welcome_lang", "en"),
                List.of(
                        List.of(
                                Map.of("text", "🇺🇿 O'zbekcha", "callback_data", "lang:uz"),
                                Map.of("text", "🇷🇺 Русский",   "callback_data", "lang:ru"),
                                Map.of("text", "🇬🇧 English",   "callback_data", "lang:en")
                        )
                ));
    }

    private void promptContact(long chatId, String loc) {
        telegram.sendContactRequest(chatId, s("ask_phone", loc), s("share_phone_btn", loc));
    }

    private void showMainMenu(long chatId, String loc) {
        telegram.sendWithInlineRows(chatId, s("main_menu", loc), List.of(
                List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                List.of(
                        Map.of("text", s("btn_status", loc), "callback_data", "status"),
                        Map.of("text", s("btn_cancel", loc), "callback_data", "cancel")
                ),
                List.of(Map.of("text", s("btn_help", loc), "callback_data", "help"))
        ));
    }

    private void handleHelp(long chatId, String loc) {
        telegram.sendWithInlineRows(chatId, s("help_body", loc), List.of(
                List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                List.of(Map.of("text", s("btn_back", loc), "callback_data", "menu"))
        ));
    }

    // ─── Status ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    private void handleStatus(long chatId, long tgUserId, String loc) {
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
                .setParameter("tid", tgUserId)
                .getSingleResult();

            String number = (String) row[0];
            String status = (String) row[1];
            int position = row[2] != null ? ((Number) row[2]).intValue() : 0;
            String branchName = (String) row[3];
            String serviceName = (String) row[4];
            Integer windowNum = row[5] != null ? ((Number) row[5]).intValue() : null;

            String statusLine = switch (status) {
                case "waiting" -> position == 0
                        ? s("status_next", loc)
                        : s("status_waiting", loc).replace("{n}", String.valueOf(position));
                case "called" -> windowNum != null
                        ? s("status_called", loc).replace("{window}", String.valueOf(windowNum))
                        : s("status_called_nowin", loc);
                case "serving" -> s("status_serving", loc);
                default -> "ℹ Status: " + status;
            };

            String body = "🎫 *" + number + "* — " + branchName + "\n_" + serviceName + "_\n\n" + statusLine;
            boolean cancellable = "waiting".equals(status) || "called".equals(status);

            if (cancellable) {
                telegram.sendWithInlineRows(chatId, body, List.of(
                        List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                        List.of(Map.of("text", s("btn_cancel", loc), "callback_data", "cancel")),
                        List.of(Map.of("text", s("btn_back",   loc), "callback_data", "menu"))
                ));
            } else {
                telegram.sendWithInlineRows(chatId, body, List.of(
                        List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                        List.of(Map.of("text", s("btn_back", loc), "callback_data", "menu"))
                ));
            }
        } catch (NoResultException e) {
            telegram.sendWithInlineRows(chatId, s("no_active_ticket", loc), List.of(
                    List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                    List.of(Map.of("text", s("btn_back",   loc), "callback_data", "menu"))
            ));
        }
    }

    // ─── Cancel flow (with confirm step) ────────────────────────────────────────

    private void handleCancelPrompt(long chatId, String loc) {
        telegram.sendWithInlineRows(chatId, s("confirm_cancel", loc), List.of(
                List.of(
                        Map.of("text", s("btn_confirm_cancel", loc), "callback_data", "cancel:confirm"),
                        Map.of("text", s("btn_back",            loc), "callback_data", "menu")
                )
        ));
    }

    @Transactional
    private void handleCancelConfirm(long chatId, long tgUserId, String loc) {
        try {
            Object[] row = (Object[]) em.createNativeQuery("""
                    SELECT t.id, ua.id FROM app.ticket t
                    JOIN app.user_account ua ON ua.id = t.customer_id
                    WHERE ua.telegram_id = :tid AND t.status IN ('waiting','called')
                    ORDER BY t.joined_at DESC LIMIT 1
                    """)
                .setParameter("tid", tgUserId)
                .getSingleResult();

            UUID ticketId   = (UUID) row[0];
            UUID customerId = (UUID) row[1];
            ticketService.cancel(ticketId, customerId);

            telegram.sendWithInlineRows(chatId, s("cancelled", loc), List.of(
                    List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                    List.of(Map.of("text", s("btn_back",   loc), "callback_data", "menu"))
            ));
        } catch (NoResultException e) {
            telegram.sendWithInlineRows(chatId, s("no_active_ticket", loc), List.of(
                    List.of(Map.of("text", s("btn_open_app", loc), "url", "https://t.me/" + botUsername + "/Zeyvo")),
                    List.of(Map.of("text", s("btn_back",   loc), "callback_data", "menu"))
            ));
        } catch (Exception e) {
            log.warn("Bot cancel failed for telegramId={}: {}", tgUserId, e.getMessage());
            telegram.sendRaw(chatId, s("cancel_failed", loc));
        }
    }

    // ─── util ───────────────────────────────────────────────────────────────────

    private static boolean constantTimeEquals(String a, String b) {
        byte[] ab = a.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(ab, bb);
    }
}
