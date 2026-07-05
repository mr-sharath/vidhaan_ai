import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-google",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-display-google",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#fdfbf7] dark:bg-[#121212] text-[#1e293b] dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
