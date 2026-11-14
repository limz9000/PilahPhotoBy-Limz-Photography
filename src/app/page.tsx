"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [driveUrl, setDriveUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl.trim()) {
      setErrorMsg("Tempelkan tautan folder Google Drive Anda terlebih dahulu.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      // Direct user to new gallery page with prefilled url
      router.push(`/dashboard/new?url=${encodeURIComponent(driveUrl.trim())}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-obsidian-bg text-obsidian-text selection:bg-gold selection:text-obsidian-bg">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Ambient glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gold/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs uppercase tracking-widest font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Sistem Proofing Foto Modern · Limz Photography
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-[1.1] mb-6 text-obsidian-text">
            Seleksi foto klien tanpa ribet,{" "}
            <span className="italic text-gold block sm:inline">tanpa drama WhatsApp.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-obsidian-muted font-normal leading-relaxed mb-10">
            Cukup tempel tautan Google Drive publik Anda. Klien memilih sendiri dari ponsel pintar dengan mode Swipe ala Tinder, kuota terkunci otomatis, dan file RAW siap disalin ke Lightroom.
          </p>

          {/* QUICK INPUT PANEL */}
          <div className="max-w-xl mx-auto bg-obsidian-surface border border-obsidian-line rounded-2xl p-4 sm:p-5 shadow-2xl relative">
            <form onSubmit={handleQuickCreate} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="Tempel link Google Drive Anda di sini..."
                className="flex-1 bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text placeholder:text-obsidian-faint focus:outline-none focus:border-gold transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-gold px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2"
              >
                {loading ? "Memproses..." : "Mulai Seleksi →"}
              </button>
            </form>

            {errorMsg && (
              <p className="mt-3 text-xs text-red-400 text-left bg-red-950/30 border border-red-800/40 px-3 py-2 rounded-lg">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between text-xs text-obsidian-faint mt-4 pt-3 border-t border-obsidian-line/60">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Zero Server Upload (Hemat Cloud)
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Bermerek Studio Anda
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Picker File RAW ke Laptop
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <Link
              href="/dashboard"
              className="text-obsidian-muted hover:text-gold transition-colors underline underline-offset-4"
            >
              Buka Dashboard Galeri →
            </Link>
            <span className="text-obsidian-line">·</span>
            <Link
              href="/login"
              className="text-obsidian-muted hover:text-gold transition-colors flex items-center gap-1.5"
            >
              <span>Masuk dengan Google</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE PILLARS */}
      <section className="py-20 border-t border-obsidian-line bg-obsidian-surface/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-gold font-bold">Teknologi Modern</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium mt-2 mb-4">
              Dirancang untuk alur kerja fotografer profesional.
            </h2>
            <p className="text-sm text-obsidian-muted">
              Tinggalkan cara lama yang membuat frustrasi. Hadirkan pengalaman berkelas bagi klien Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Zero Server Upload</h3>
              <p className="text-sm text-obsidian-muted leading-relaxed">
                Tidak perlu upload ulang ratusan GB foto ke server web. PilahFoto langsung membaca thumbnail beresolusi tinggi langsung dari folder Google Drive Anda.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Mode Swipe ala Tinder di HP</h3>
              <p className="text-sm text-obsidian-muted leading-relaxed">
                Klien cukup membuka link via WhatsApp. Tersedia mode Swipe sentuh jempol (kanan = pilih, kiri = lewati) dan tampilan kisi proporsional tanpa terpotong.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Batas Kuota & Kunci Permanen</h3>
              <p className="text-sm text-obsidian-muted leading-relaxed">
                Tentukan kuota (misal: 50 foto). Klien tidak dapat memilih berlebih, dan begitu tombol Kirim ditekan, galeri terkunci permanen mencegah revisi berulang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-obsidian-line text-center text-xs text-obsidian-faint">
        <p>© 2026 PilahFoto by Limz Photography. All Rights Reserved.</p>
        <p className="mt-2 text-obsidian-muted">
          Arsitektur Sistem Seleksi Foto Klien · Didukung oleh Google Drive Streaming & File System Access API
        </p>
      </footer>
    </main>
  );
}

