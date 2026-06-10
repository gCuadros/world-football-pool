import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/app/sw-register";
import { ThemeColorSync } from "@/components/app/theme-color-sync";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

// Display técnica-deportiva para marcadores y micro-etiquetas: mantiene la
// variable --font-mono para que todos los `font-mono` existentes la hereden.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Quiniela · Mundial 2026",
    template: "%s · Quiniela",
  },
  description:
    "Plataforma de predicciones para el FIFA World Cup 2026. Compite con tus amigos prediciendo los 64 partidos del mundial.",
  applicationName: "Quiniela Mundial 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quiniela",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  // `cover` activa los safe-areas (env()) en iPhone instalada como PWA:
  // sin él, el padding del bottom-nav y el topbar sobre el notch no aplican.
  viewportFit: "cover",
  themeColor: [
    // El claro coincide con --background para que la barra de estado se funda
    // con la app (como una app nativa), no con el azul de marca.
    { media: "(prefers-color-scheme: light)", color: "#F4F7FF" },
    { media: "(prefers-color-scheme: dark)", color: "#07090F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full",
        "antialiased",
        spaceGrotesk.variable,
        "font-sans",
        jakartaSans.variable,
      )}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ThemeColorSync />
          <SwRegister />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
