import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED = ["en", "ru", "uz"] as const;
type Supported = (typeof SUPPORTED)[number];
const DEFAULT_LOCALE: Supported = "uz";

function pickLocale(raw: string | undefined): Supported {
  if (!raw) return DEFAULT_LOCALE;
  return (SUPPORTED as readonly string[]).includes(raw) ? (raw as Supported) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = pickLocale(cookieStore.get("NEXT_LOCALE")?.value);
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
