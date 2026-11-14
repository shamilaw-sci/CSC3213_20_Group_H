import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import RootLayoutWrapper from "@/components/RootLayoutWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CareBridge",
  description:
    "Mental health support for university students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <RootLayoutWrapper>{children}</RootLayoutWrapper>
      </body>
    </html>
  );
}