import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — zeyvo",
  description: "How zeyvo collects, uses, and protects your personal data.",
};

const SECTIONS = [
  {
    title: "1. Who we are",
    content: `zeyvo ("we", "us") is a queue and appointment management platform operated by zeyvo labs, based in Tashkent, Republic of Uzbekistan. Contact: support@zeyvo.tech.

This Privacy Policy explains what personal data we collect, why we collect it, how long we keep it, and your rights under the laws of the Republic of Uzbekistan (Law on Personal Data, 2019).`,
  },
  {
    title: "2. Data we collect",
    content: `**When you create an account:**
• Full name and phone number (used for authentication via OTP)
• Organisation name and address (if you register an organisation)
• Preferred language (uz / ru / en)

**When you use the service as a visitor / customer:**
• Queue position and ticket history (branch visited, service requested, wait time, outcome)
• Your Telegram user ID and first name if you use the Telegram bot or mini app

**Automatically:**
• IP address, browser / device type (for security logs, not marketing)
• Timestamps of API requests (retained 30 days in access logs)`,
  },
  {
    title: "3. Why we collect it",
    content: `• **Authentication** — we verify your phone number with a one-time code to prevent unauthorised access.
• **Service delivery** — your ticket and appointment data is required to operate the queue.
• **Notifications** — we send queue-status updates via Telegram bot or browser notification.
• **Fraud prevention and security** — IP and device data are used to detect and block abuse.
• **Analytics** — aggregated, anonymised queue statistics help organisations improve service times. Individual records are not sold or shared with third parties.`,
  },
  {
    title: "4. Data retention",
    content: `• **Served / completed tickets** — 12 months, then automatically deleted.
• **Cancelled / expired tickets** — 30 days.
• **Account data** — retained while your account is active. Deleted within 30 days of a verified deletion request.
• **Telegram IDs** — retained while linked to an account; unlinked on account deletion.
• **Access logs** — 30 days.`,
  },
  {
    title: "5. Data sharing",
    content: `We do **not** sell your personal data. We share data only with:
• **The organisation you visit** — they see your name, ticket number, and service chosen. They do not see your phone number unless you explicitly share it with them.
• **DevSMS.uz** — your phone number is transmitted to send the OTP. DevSMS processes it under their own privacy policy.
• **Telegram** — if you use our bot, your Telegram ID is processed by Telegram in accordance with their privacy policy.
• **Hosting infrastructure** — our servers run on DigitalOcean (US). Data is encrypted in transit (TLS) and at rest.`,
  },
  {
    title: "6. Your rights",
    content: `Under Uzbekistan law you have the right to:
• **Access** — request a copy of your personal data.
• **Correction** — ask us to fix inaccurate data.
• **Deletion** — request deletion of your account and associated data.
• **Objection** — object to processing for analytics purposes.

To exercise any of these rights, email **support@zeyvo.tech** with the subject line "Data request – [your phone number]". We will respond within 15 business days.`,
  },
  {
    title: "7. Security",
    content: `We use industry-standard measures: TLS 1.3 for all traffic, bcrypt-hashed credentials, HMAC-verified Telegram auth, and daily encrypted backups. No system is 100% secure; we will notify affected users within 72 hours of any confirmed breach.`,
  },
  {
    title: "8. Cookies",
    content: `We use one first-party cookie: **NEXT_LOCALE** — stores your language preference (uz / ru / en). No tracking or advertising cookies are used.`,
  },
  {
    title: "9. Children",
    content: `zeyvo is not directed at children under 14. We do not knowingly collect data from children. If you believe a child has provided us data, contact support@zeyvo.tech.`,
  },
  {
    title: "10. Changes to this policy",
    content: `We may update this policy. Material changes will be announced via the platform or email at least 14 days before they take effect. The current version is always available at zeyvo.tech/privacy.`,
  },
  {
    title: "11. Contact / DPO",
    content: `Data Protection contact: **support@zeyvo.tech**
Governing jurisdiction: Republic of Uzbekistan`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e15",
      color: "#fff",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Nav */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 15, fontWeight: 600, color: "#fff", textDecoration: "none",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 9h8l-8 6h8"/>
            </svg>
            zeyvo
          </Link>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>Privacy Policy</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 6,
            background: "rgba(120,160,255,0.1)", color: "oklch(0.78 0.14 220)",
            fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase",
            letterSpacing: 0.6, marginBottom: 16,
          }}>
            Legal
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8, margin: "0 0 12px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0, fontFamily: "var(--font-mono)" }}>
            Effective date: 22 May 2026 · Jurisdiction: Republic of Uzbekistan
          </p>
        </div>

        {SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 12px", color: "#fff" }}>
              {s.title}
            </h2>
            <div style={{
              fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.7)",
              whiteSpace: "pre-wrap",
            }}>
              {s.content.split(/\*\*(.+?)\*\*/g).map((part, i) =>
                i % 2 === 1
                  ? <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{part}</strong>
                  : <span key={i}>{part}</span>
              )}
            </div>
          </div>
        ))}

        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 28, marginTop: 8,
          display: "flex", gap: 16, flexWrap: "wrap",
        }}>
          <Link href={"/terms" as any} style={{ fontSize: 13, color: "oklch(0.78 0.14 220)", textDecoration: "none" }}>
            Terms of Use →
          </Link>
          <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
