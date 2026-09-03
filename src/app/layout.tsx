import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ChapaProviders } from "@/components/chapa/providers";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CHAPA — VIGOR AI",
  description: "Coach autónomo de treino, nutrição e evolução física.",
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
      <body className="min-h-full bg-background text-foreground">
        <AntdRegistry>
          <ChapaProviders>{children}</ChapaProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
