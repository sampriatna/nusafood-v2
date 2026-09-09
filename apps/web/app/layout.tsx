import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskNF3 v2 - Nusa Food Task & Report System",
  description:
    "Sistem manajemen tugas operasional v2 untuk Kopi Buri Umah, Kisamen, dan Samtaro Express",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="bg-background">
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
