import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Scriptorium — AI Book Writer",
  description:
    "An automated, human-in-the-loop AI book-writing system powered by LangGraph and GPT-4o. Generate full 50-page books without hallucination through rigorous context isolation.",
  keywords: ["AI writing", "book generator", "LangGraph", "GPT-4o"],
  openGraph: {
    title: "Scriptorium — AI Book Writer",
    description: "Generate coherent, long-form books with AI + human oversight",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0f] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
