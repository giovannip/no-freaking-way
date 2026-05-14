import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import appIcon from "@design/mockups/design-logo-nem-fudendo-icon.png";
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
  title: "Nem fudendo — o jogo",
  description: "Curiosidades numéricas, lobby com código e NEM FUDENDO.",
  icons: {
    icon: [{ url: appIcon.src, type: "image/png", sizes: "512x512" }],
    apple: [{ url: appIcon.src, sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
