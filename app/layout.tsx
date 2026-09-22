import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klantendashboard",
  description: "Klanten en feedbackmomenten",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="font-mono min-h-screen">{children}</body>
    </html>
  );
}
