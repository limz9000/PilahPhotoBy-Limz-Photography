"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gallery } from "@/lib/types";

export default function PickerIndexPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/galleries")
      .then((res) => res.json())
      .then((data) => {
        if (data.galleries) setGalleries(data.galleries);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text selection:bg-gold selection:text-obsidian-bg">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs uppercase tracking-widest font-bold mb-3">
            <span>Web File System Access API</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium">
            Web Picker RAW Studio
          </h1>
          <p className="text-sm text-obsidian-muted mt-2 max-w-2xl leading-relaxed">
            Pilih galeri klien untuk membuka alat sinkronisasi file RAW kamera asli langsung di laptop Anda tanpa perlu menyalin satu per satu ke Adobe Lightroom Classic.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-obsidian-muted text-sm">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Memuat daftar galeri...
          </div>
        ) : galleries.length === 0 ? (
          <div className="py-16 text-center bg-obsidian-surface border border-obsidian-line rounded-3xl">
            <p className="font-serif text-lg text-obsidian-muted">Belum ada galeri yang dibuat.</p>
            <Link href="/dashboard" className="mt-4 inline-block btn-gold px-6 py-2.5 rounded-xl text-xs font-bold">
              Buat Galeri Baru di Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-obsidian-surface2 text-gold border border-gold/20">
                      {gallery.gallery_code}
                    </span>
                    <span className="text-xs text-obsidian-muted">
                      {gallery.selected_count || 0} / {gallery.max_selection} dipilih
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-obsidian-text">
                    {gallery.client_name || gallery.title}
                  </h3>
                  <p className="text-xs text-obsidian-faint mt-1">
                    {gallery.title}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-obsidian-line/60 flex items-center justify-between">
                  <span className="text-xs text-obsidian-muted">
                    {gallery.photo_count || 0} foto sumber
                  </span>
                  <Link
                    href={`/dashboard/picker/${gallery.gallery_code}`}
                    className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Buka Web Picker</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

