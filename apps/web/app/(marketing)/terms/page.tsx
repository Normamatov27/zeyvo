import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — zeyvo",
  description: "Terms governing use of the zeyvo queue and appointment platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance",
    content: `By creating an account or using zeyvo (the "Service"), you agree to these Terms of Use. If you do not agree, do not use the Service.

These Terms are governed by the laws of the Republic of Uzbekistan. Any dispute will be resolved in the courts of Tashkent.`,
  },
  {
    title: "2. Who may use zeyvo",
    content: `**As an organisation ("Operator"):** You must be at least 18 years old and authorised to act on behalf of the organisation you register. By completing onboarding you confirm that you have the authority to enter this agreement.

**As a customer / visitor:** Anyone can use the public queue and booking features without registration. Registering an account requires a valid Uzbekistan phone number.`,
  },
  {
    title: "3. The Service",
    content: `zeyvo provides:
• Digital queue management (live tickets, real-time status)
• Appointment booking for future time slots
• Operator dashboard to manage branches, services, staff, and windows
• Telegram bot and mini app for mobile access
• Analytics and reporting for registered organisations

We reserve the right to modify, suspend, or discontinue any feature with 14 days' notice for material changes. Bug fixes and minor changes may be deployed without notice.`,
  },
  {
    title: "4. Acceptable use",
    content: `You must not:
• Use the Service to send spam, unsolicited messages, or bulk automated requests
• Attempt to reverse-engineer, scrape, or overload our infrastructure
• Register fake organisations or impersonate others
• Use the Service for any illegal purpose under Uzbekistan law
• Interfere with other users' access to the queue

Violations may result in immediate account suspension without refund.`,
  },
  {
    title: "5. Billing and pricing",
    content: `**Early access period:** The Service is currently free of charge for all registered organisations. We will provide at least 30 days' notice before introducing paid plans.

When paid plans are introduced:
• Billing will be monthly or annual, in UZS or USD at your choice.
• You may cancel at any time; access continues until the end of the paid period.
• No refunds for partial months unless required by Uzbekistan consumer law.`,
  },
  {
    title: "6. Data and privacy",
    content: `Your use of the Service is also governed by our **Privacy Policy** (zeyvo.tech/privacy). By using the Service you confirm you have read and understood it.

Operators are responsible for informing their own customers that zeyvo processes queue data on their behalf.`,
  },
  {
    title: "7. Intellectual property",
    content: `All software, design, logos, and content in the Service are owned by zeyvo labs or its licensors. You may not copy, reproduce, or redistribute them without written permission.

You retain ownership of your data (branch names, customer records, analytics). You grant us a limited licence to store and process this data solely to provide the Service.`,
  },
  {
    title: "8. Availability and SLA",
    content: `We target 99.5% monthly uptime excluding scheduled maintenance. We do not guarantee any specific response time or queue throughput. The Service is provided "as is" during the early access period.

Scheduled maintenance windows will be announced at least 2 hours in advance via the platform or Telegram channel.`,
  },
  {
    title: "9. Limitation of liability",
    content: `To the maximum extent permitted by law:
• We are not liable for indirect, incidental, or consequential damages (lost revenue, lost customers, etc.).
• Our total liability for any claim is limited to the amount you paid us in the 3 months preceding the claim (or UZS 100,000 if nothing was paid).

This does not limit liability for fraud, gross negligence, or statutory consumer rights.`,
  },
  {
    title: "10. Termination",
    content: `**By you:** Delete your account at any time via Settings → Account → Delete account. Your data will be purged within 30 days.

**By us:** We may terminate accounts that violate these Terms. We will give 7 days' notice unless the violation is severe (spam, illegal activity, security threat).`,
  },
  {
    title: "11. Changes to these Terms",
    content: `We may update these Terms. Material changes (pricing, liability, data rights) will be communicated 30 days in advance. Continuing to use the Service after that date constitutes acceptance. The current version is always at zeyvo.tech/terms.`,
  },
  {
    title: "12. Contact",
    content: `zeyvo labs · Tashkent, Uzbekistan
Email: support@zeyvo.tech
Last updated: 22 May 2026`,
  },
];

export default function TermsPage() {
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
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>Terms of Use</span>
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
            Terms of Use
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
          <Link href={"/privacy" as any} style={{ fontSize: 13, color: "oklch(0.78 0.14 220)", textDecoration: "none" }}>
            Privacy Policy →
          </Link>
          <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
