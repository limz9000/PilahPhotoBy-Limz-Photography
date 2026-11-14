"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gallery } from "@/lib/types";

export default function DashboardPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/galleries");
      const data = await res.json();
      if (data.galleries) {
        setGalleries(data.galleries);
      }
    } catch (err) {
      console.error("Gagal memuat galeri:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const copyClientLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const clientUrl = `${origin}/g/${code}`;
    navigator.clipboard.writeText(clientUrl);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const activeCount = galleries.filter((g) => g.status === "active").length;
  const submittedCount = galleries.filter((g) => g.status === "submitted").length;

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-obsidian-line">
          <div>
            <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-widest font-bold">
              <span>Studio Control Panel</span>
              <span>·</span>
              <span>Limz Photography</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium mt-1">Daftar Galeri Seleksi</h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Kelola link seleksi klien, pantau progres pilihan, dan jalankan Web Picker untuk sinkronisasi file RAW.
            </p>
          </div>

          <Link
            href="/dashboard/new"
            className="btn-gold px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Buat Galeri Baru
          </Link>
        </div>

        {/* METRIC CARDS (GRID 3 KOLOM ANTI-TUMPUK VERTIKAL SESUAI ZETTBOT) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
          <div className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-line">
            <span className="text-xs font-semibold text-obsidian-muted uppercase tracking-wider">Total Galeri</span>
            <div className="font-serif text-3xl font-semibold mt-2 text-obsidian-text">{galleries.length}</div>
            <p className="text-xs text-obsidian-faint mt-1">Projek sesi foto terdaftar</p>
          </div>

          <div className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-line">
            <span className="text-xs font-semibold text-gold uppercase tracking-wider">Sedang Memilih</span>
            <div className="font-serif text-3xl font-semibold mt-2 text-gold">{activeCount}</div>
            <p className="text-xs text-obsidian-faint mt-1">Galeri aktif di tangan klien</p>
          </div>

          <div className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-line">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Selesai Dipilih</span>
            <div className="font-serif text-3xl font-semibold mt-2 text-emerald-400">{submittedCount}</div>
            <p className="text-xs text-obsidian-faint mt-1">Terkunci & siap diproses RAW</p>
          </div>
        </div>

        {/* GALLERY LIST TABLE */}
        <div className="bg-obsidian-surface border border-obsidian-line rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-obsidian-line flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium">Semua Galeri</h2>
            <button
              onClick={fetchGalleries}
              className="text-xs text-obsidian-muted hover:text-gold flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Segarkan Data
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-obsidian-muted text-sm">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Memuat data galeri...
            </div>
          ) : galleries.length === 0 ? (
            <div className="p-12 text-center text-obsidian-muted text-sm">
              <p className="text-base font-serif text-obsidian-text mb-2">Belum ada galeri yang dibuat.</p>
              <p className="text-xs text-obsidian-muted max-w-sm mx-auto mb-6">
                Mulai buat galeri seleksi pertama Anda hanya dengan menempelkan tautan folder Google Drive.
              </p>
              <Link
                href="/dashboard/new"
                className="btn-gold px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2"
              >
                + Buat Galeri Sekarang
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-obsidian-line text-xs uppercase tracking-wider text-obsidian-muted bg-obsidian-surface2/50">
                    <th className="py-3.5 px-4 font-semibold">Kode Galeri</th>
                    <th className="py-3.5 px-4 font-semibold">Judul & Klien</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Progres Pilihan</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Aksi Studio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-line/60">
                  {galleries.map((g) => {
                    const isSubmitted = g.status === "submitted";
                    const isCopied = copiedId === g.gallery_code;

                    return (
                      <tr key={g.id} className="hover:bg-obsidian-surface2/40 transition-colors">
                        {/* Kode Galeri (Format Sekuensial ZettBOT) */}
                        <td className="py-4 px-4 font-mono text-xs text-gold font-medium whitespace-nowrap">
                          {g.gallery_code}
                        </td>

                        {/* Judul & Klien */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-obsidian-text">{g.title}</div>
                          <div className="text-xs text-obsidian-muted mt-0.5">Klien: {g.client_name}</div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Selesai Dipilih
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/15 text-gold border border-gold/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                              Sedang Memilih
                            </span>
                          )}
                        </td>

                        {/* Progres Pilihan */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-obsidian-text">
                            <span className="text-gold font-bold">{g.selected_count || 0}</span> / {g.max_selection} foto
                          </div>
                          <div className="text-[11px] text-obsidian-faint">
                            Total foto di Drive: {g.photo_count || 0}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {/* Salin Link Klien */}
                            <button
                              onClick={() => copyClientLink(g.gallery_code)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-obsidian-line bg-obsidian-surface2 hover:border-gold hover:text-gold transition-colors flex items-center gap-1"
                              title="Salin link untuk dikirim ke klien"
                            >
                              {isCopied ? "✓ Disalin!" : "Salin Link WA"}
                            </button>

                            {/* Buka Galeri Klien */}
                            <Link
                              href={`/g/${g.gallery_code}`}
                              target="_blank"
                              className="text-xs px-3 py-1.5 rounded-lg border border-obsidian-line bg-obsidian-surface2 hover:border-gold hover:text-gold transition-colors"
                            >
                              Buka Galeri ↗
                            </Link>

                            {/* Web Picker (Lightroom / RAW sync) */}
                            <Link
                              href={`/dashboard/picker/${g.gallery_code}`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-gold/20 text-gold border border-gold/40 hover:bg-gold hover:text-obsidian-bg font-semibold transition-all flex items-center gap-1"
                              title="Alat pencocok file RAW lokal"
                            >
                              ⚡ Web Picker
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

