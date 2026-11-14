import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PilahFoto by Limz Photography — Client Photo Proofing",
  description:
    "Platform seleksi foto klien tanpa ribet untuk fotografer. Terhubung langsung ke Google Drive tanpa upload ulang, tampilan mewah, dan picker RAW otomatis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-obsidian-bg text-obsidian-text antialiased selection:bg-gold selection:text-obsidian-bg">
        {children}
      </body>
    </html>
  );
}
