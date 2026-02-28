import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oasis Astra - Token Creator",
  description: "Create and deploy ERC20 tokens on Oasis Sapphire",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-pump-bg text-pump-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
