import type { Metadata } from "next";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Merchandise Reuni Akbar InVnity 2026",
  description: "Belanja merchandise resmi Reuni Akbar IA 5 Bandung - InVnity 2026",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
