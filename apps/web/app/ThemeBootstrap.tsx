"use client";

import { useEffect } from "react";
import { useUiStore, applyTheme } from "@/stores/ui";

export default function ThemeBootstrap() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
    // Also respond to OS-level changes when theme is "system"
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  return null;
}
