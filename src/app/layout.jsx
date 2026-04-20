import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "HappyLens — Photo-trip planner & shot coach",
  description:
    "Plan photo shoots with sun/moon/tide/weather + AI shot recipes. Upload afterwards for EXIF-aware critique.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HappyLens" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#3d2b1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@500;600;700&family=Caveat:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <Script id="theme-init" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('hf-theme')||'system';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`}</Script>
      </head>
      <body suppressHydrationWarning>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
