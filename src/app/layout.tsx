import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | SESA Event Tracker",
    default: "SESA Event Tracker | MIT Academy of Engineering",
  },
  description:
    "Official Event Lifecycle & Attendance Platform for Software Engineering Student Association (SESA), Department Of Software Engineering, MITAOE, Pune.",
  keywords: [
    "SESA",
    "MITAOE",
    "Software Engineering Student Association",
    "Event Tracker",
    "Attendance Management",
    "Software Engineering",
  ],
  authors: [{ name: "SESA MITAOE" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8F1E6] text-[#09172B] antialiased selection:bg-[#E4BC70]/30 selection:text-[#09172B]">
        {children}
      </body>
    </html>
  );
}
