import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Klozer — Conversational AI Commerce & Smart CRM",
  description:
    "Platform Omnichannel Conversational AI Commerce & CRM Terpadu. Ubah chat WhatsApp menjadi mesin penjualan otomatis dengan Dynamic QRIS, AI Voice Note, Fraud Detection, dan Smart Lead Distribution.",
  keywords: "CRM, WhatsApp, AI, Commerce, QRIS, Chatbot, Indonesia",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
