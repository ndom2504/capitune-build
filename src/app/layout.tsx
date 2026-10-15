import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans-actual",
  subsets: ["latin"],
});

const serif = Instrument_Serif({
  variable: "--font-serif-actual",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Capitune",
  description: "Générez des sites web à partir d’instructions en langage naturel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>{children}</body>
    </html>
  );
}
