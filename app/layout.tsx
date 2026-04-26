import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Daily Assistant",
  description:
    "An agentic AI assistant that turns your goals into a prioritized daily plan. Available on the web and Telegram.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
