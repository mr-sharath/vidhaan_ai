import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vidhaan AI | Production-Grade Indian Legal Assistant Platform",
  description: "Vidhaan AI is a high-fidelity legal research assistant leveraging an agentic hybrid dense-sparse RAG pipeline over authoritative Indian statutory law documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full max-h-full overflow-hidden antialiased`}
    >
      <body className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#fdfbf7] dark:bg-[#080d0b]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
