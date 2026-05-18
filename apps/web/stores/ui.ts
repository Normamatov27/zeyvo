import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  locale: "en" | "ru" | "uz";
  setTheme: (t: Theme) => void;
  setLocale: (l: "en" | "ru" | "uz") => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      locale: "uz",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setLocale: (locale) => set({ locale }),
    }),
    { name: "zeyvo-ui" }
  )
);

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
