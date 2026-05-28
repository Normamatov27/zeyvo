import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeBootstrap from "./ThemeBootstrap";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "zeyvo", template: "%s · zeyvo" },
  description: "A navigation system for real-world waiting.",
  manifest: "/manifest.json",
  icons: {
    icon: { url: "/logo.jpg", type: "image/jpeg" },
    apple: "/logo.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c2a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeBootstrap />
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
