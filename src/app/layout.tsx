import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finus - Aile Bütçesi",
  description: "Modüler Aile Bütçesi Uygulaması",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-slate-950 text-slate-100 overflow-hidden">
        <div className="flex h-screen w-screen overflow-hidden">
          {/* Sidebar solda sabit 264px tutulur */}
          <Sidebar />
          
          {/* Main alanı sağda kalan tüm alanı kaplar */}
          <main className="flex-1 overflow-y-auto min-w-0 bg-slate-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}