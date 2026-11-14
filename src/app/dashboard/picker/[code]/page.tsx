"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gallery, Photo } from "@/lib/types";

interface PickerProps {
  params: Promise<{ code: string }>;
}

export default function WebPickerPage({ params }: PickerProps) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [copiedQuery, setCopiedQuery] = useState(false);

  // File System Access API State
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [matchedFilesCount, setMatchedFilesCount] = useState<number | null>(null);

  useEffect(() => {
    const loadGalleryData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/galleries/${code}`);
        const data = await res.json();
        if (data.gallery) {
          setGallery(data.gallery);
          const chosen = (data.photos || []).filter((p: Photo) => p.is_selected);
          setSelectedPhotos(chosen);
        }
      } catch (err) {
        console.error("Gagal memuat data galeri untuk Picker:", err);
      } finally {
        setLoading(false);
      }
    };
    loadGalleryData();
  }, [code]);

  // Extract base names without extension (e.g. "DSC01234.JPG" -> "DSC01234")
  const baseFileNames = selectedPhotos.map((p) => {
    return p.file_name.substring(0, p.file_name.lastIndexOf(".")) || p.file_name;
  });

  // Generate Lightroom Search Query: "DSC01234 OR DSC01250"
  const lightroomQuery = baseFileNames.join(" OR ");

  const handleCopyLightroom = () => {
    if (!lightroomQuery) return;
    navigator.clipboard.writeText(lightroomQuery);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (selectedPhotos.length === 0) return;
    const content = selectedPhotos.map((p) => p.file_name).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pilihan_${code}_${gallery?.client_name || "Klien"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Browser Native File System Access API (Salin File RAW Otomatis)
  const handleSelectRawDirectory = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert(
        "Browser Anda belum mendukung File System Access API. Silakan gunakan Google Chrome atau Microsoft Edge di laptop/komputer untuk menggunakan fitur salin file otomatis."
      );
      return;
    }

    if (baseFileNames.length === 0) {
      alert("Belum ada foto yang dipilih oleh klien pada galeri ini.");
      return;
    }

    try {
      setIsProcessingLocal(true);
      setScanStatus("Membuka dialog pemilihan folder di komputer...");

      // @ts-ignore
      const sourceDirHandle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      setScanStatus("Memindai file RAW di folder yang dipilih...");

      // Set target base filenames for matching
      const targetBaseNames = new Set(baseFileNames.map((n) => n.toUpperCase()));

      // Create destination folder: "Foto_Pilihan_Klien"
      // @ts-ignore
      const destDirHandle = await sourceDirHandle.getDirectoryHandle(
        `Foto_Pilihan_${gallery?.client_name?.replace(/[^a-zA-Z0-9]/g, "_") || "Klien"}`,
        { create: true }
      );

      let matched = 0;

      // Iterate through files in source directory
      // @ts-ignore
      for await (const entry of sourceDirHandle.values()) {
        if (entry.kind === "file") {
          const fileName: string = entry.name;
          const dotIdx = fileName.lastIndexOf(".");
          const base = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;

          if (targetBaseNames.has(base.toUpperCase())) {
            setScanStatus(`Menyalin file RAW: ${fileName}...`);
            const file = await entry.getFile();
            // @ts-ignore
            const newFileHandle = await destDirHandle.getFileHandle(fileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            matched++;
          }
        }
      }

      setMatchedFilesCount(matched);
      setScanStatus(`Selesai! Berhasil menyalin ${matched} file RAW ke subfolder baru.`);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setScanStatus(`Gagal memproses folder: ${err.message}`);
      } else {
        setScanStatus("Pemilihan folder dibatalkan.");
      }
    } finally {
      setIsProcessingLocal(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-xs text-obsidian-muted hover:text-gold flex items-center gap-1.5 mb-3 transition-colors"
          >
            ← Kembali ke Dashboard Studio
          </Link>
          <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-widest font-bold">
            <span>PilahFoto Picker · Engine Sinkronisasi RAW</span>
            <span>·</span>
            <span>{code}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium mt-1">
            Web Picker & Integrasi Lightroom
          </h1>
          <p className="text-sm text-obsidian-muted mt-1">
            Jembatani hasil pilihan klien ke komputer fotografer secara instan tanpa perlu mencari ribuan file satu per satu.
          </p>
        </div>

        {loading ? (
          <div className="p-16 text-center text-obsidian-muted text-sm">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Memuat data pilihan klien...
          </div>
        ) : !gallery ? (
          <div className="p-12 text-center text-obsidian-muted">Galeri tidak ditemukan.</div>
        ) : (
          <div className="space-y-6">
            {/* STATUS REKAP KLIEN */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-obsidian-muted uppercase tracking-wider font-semibold">Projek Foto</span>
                <h2 className="font-serif text-2xl font-semibold mt-0.5">{gallery.title}</h2>
                <p className="text-xs text-obsidian-muted mt-1">
                  Klien: <span className="text-obsidian-text font-medium">{gallery.client_name}</span> · Status:{" "}
                  <span className={gallery.status === "submitted" ? "text-emerald-400 font-bold" : "text-gold font-bold"}>
                    {gallery.status === "submitted" ? "Selesai Dikunci Klien" : "Sedang Berjalan"}
                  </span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-obsidian-surface2 border border-obsidian-line text-center shrink-0">
                <div className="text-xs text-obsidian-muted uppercase font-semibold">Foto Terpilih</div>
                <div className="font-serif text-3xl font-bold text-gold mt-1">
                  {selectedPhotos.length}
                  <span className="text-sm text-obsidian-muted font-sans font-normal"> / {gallery.max_selection}</span>
                </div>
              </div>
            </div>

            {/* METODE 1: SALIN OTOMATIS VIA FILE SYSTEM ACCESS API */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-gold/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gold text-obsidian-bg text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">
                Otomatis via Browser
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-xl font-semibold text-obsidian-text">
                    Salin File RAW Kamera Langsung di Komputer
                  </h3>
                  <p className="text-xs text-obsidian-muted mt-1 leading-relaxed">
                    Pilih folder tempat Anda menyimpan file RAW asli kamera (Canon .CR3, Sony .ARW, Nikon .NEF, Fuji .RAF). PilahFoto akan otomatis memindai dan menyalin file RAW yang cocok ke subfolder baru di dalam komputer Anda.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSelectRawDirectory}
                      disabled={isProcessingLocal || selectedPhotos.length === 0}
                      className="btn-gold px-6 py-3 rounded-full text-xs font-bold inline-flex items-center gap-2"
                    >
                      {isProcessingLocal ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-obsidian-bg border-t-transparent rounded-full animate-spin" />
                          Memproses Salin RAW...
                        </>
                      ) : (
                        "⚡ Pilih Folder RAW di Laptop & Salin Otomatis"
                      )}
                    </button>
                  </div>

                  {scanStatus && (
                    <div className="mt-3 text-xs p-3 rounded-xl bg-obsidian-surface2 border border-obsidian-line text-gold font-mono">
                      {scanStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* METODE 2: INTEGRASI ADOBE LIGHTROOM CLASSIC */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-xl">Lr</span>
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-xl font-semibold text-obsidian-text">
                    Filter Kata Kunci Adobe Lightroom Classic
                  </h3>
                  <p className="text-xs text-obsidian-muted mt-1 leading-relaxed">
                    Salin teks pencarian filter di bawah ini, lalu tempelkan ke <b>Library Filter (Text → Filename → Contains)</b> di Adobe Lightroom Classic. Semua foto pilihan klien akan langsung muncul siap diedit!
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      readOnly
                      value={lightroomQuery || "Belum ada foto yang dipilih klien"}
                      className="flex-1 bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs text-obsidian-muted font-mono focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLightroom}
                      disabled={!lightroomQuery}
                      className="px-5 py-2.5 rounded-xl bg-obsidian-surface2 border border-blue-500/40 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold whitespace-nowrap"
                    >
                      {copiedQuery ? "✓ Disalin!" : "Salin Filter Lightroom"}
                    </button>
                    <button
                      onClick={handleDownloadTxt}
                      disabled={selectedPhotos.length === 0}
                      className="px-4 py-2.5 rounded-xl border border-obsidian-line text-xs font-medium text-obsidian-muted hover:text-obsidian-text hover:border-obsidian-muted transition-colors whitespace-nowrap"
                    >
                      Unduh .TXT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* DAFTAR FOTO TERPILIH */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line">
              <h3 className="font-serif text-lg font-semibold mb-3">
                Daftar File Pilihan Klien ({selectedPhotos.length} Foto)
              </h3>

              {selectedPhotos.length === 0 ? (
                <p className="text-xs text-obsidian-muted">Belum ada foto yang dipilih oleh klien.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-72 overflow-y-auto p-2 bg-obsidian-surface2/40 rounded-xl border border-obsidian-line">
                  {selectedPhotos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-obsidian-line group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumbnail_url}
                        alt={p.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 text-[9px] font-mono text-obsidian-text truncate text-center">
                        {p.file_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

