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
      <body className="min-h-full bg-slate-950 text-slate-100">
        <div className="flex min-h-screen w-full bg-slate-950 md:h-screen md:overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto bg-slate-950 pb-24 md:pb-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
