import "./globals.css";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import AppShell from "./_components/AppShell";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/ThemeProvider";

// Self-hosted via next/font: no render-blocking Google Fonts request, fonts are
// preloaded, and font-display is handled automatically (with metric-compatible
// fallbacks to avoid layout shift). Weight/style subsets mirror the previous
// Google Fonts URL exactly.
const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
});

const fraunces = Fraunces({
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata = {
  title: "Happy Lens AI — Shot coach",
  description:
    "Shot coach for iPhone photography — lens, settings and position tuned to the light you'll actually have.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Happy Lens" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/icon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#203b34" },
    { media: "(prefers-color-scheme: dark)", color: "#18211f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${atkinson.variable} ${fraunces.variable}`}>
      <body suppressHydrationWarning>
        {/* Applies the stored theme before paint so there is no flash of the
            wrong palette. Must run before React hydrates. */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
