import type { Metadata } from "next";
import { Sora, Inter, Dancing_Script } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });
const script = Dancing_Script({ subsets: ["latin"], variable: "--font-script", weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Smart Laundry System",
  description: "Book washing & ironing, track pickup and delivery, all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${inter.variable} ${script.variable} font-body bg-suds text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
