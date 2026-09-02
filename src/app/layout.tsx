import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CHAPA",
  description: "Treino, nutrição, suplementos e coach IA — barriga chapada, braço grosso.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CHAPA" },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className={`${sora.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
