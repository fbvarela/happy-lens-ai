import "./globals.css";
import AppShell from "./_components/AppShell";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
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
