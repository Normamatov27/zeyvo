import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeBootstrap from "./ThemeBootstrap";

export const metadata: Metadata = {
  title: { default: "zeyvo", template: "%s · zeyvo" },
  description: "A navigation system for real-world waiting.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c2a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body>
        <ThemeBootstrap />
        {children}
      </body>
    </html>
  );
}
