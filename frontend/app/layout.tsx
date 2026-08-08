import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scriptorium — AI Book Writer",
  description:
    "An automated, human-in-the-loop AI book-writing pipeline built with Apple design craft principles and LangGraph.",
  keywords: ["AI writing", "book generator", "LangGraph", "Apple design", "GPT-4o"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F2F2F7] text-[#1C1C1E] antialiased selection:bg-blue-100">
        {children}
      </body>
    </html>
  );
}
