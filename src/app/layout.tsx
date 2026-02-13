import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blue Ocean Program - GMC Checker",
  description:
    "Scan your Shopify store for Google Merchant Center compliance issues. Get instant reports and fix rejections fast.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
