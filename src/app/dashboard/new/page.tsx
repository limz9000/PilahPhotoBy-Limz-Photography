"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { DriveParsedFile } from "@/lib/types";

function NewGalleryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [maxSelection, setMaxSelection] = useState<number>(50);
  const [deadlineDate, setDeadlineDate] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<DriveParsedFile[]>([]);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successCode, setSuccessCode] = useState<string | null>(null);

  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) {
      setDriveUrl(prefillUrl);
      handleScanDrive(prefillUrl);
    }
  }, [searchParams]);

  const handleScanDrive = async (urlToScan?: string) => {
    const targetUrl = urlToScan || driveUrl;
    if (!targetUrl.trim()) {
      setErrorMsg("Masukkan tautan folder Google Drive terlebih dahulu.");
      return;
    }

    setErrorMsg("");
    setIsScanning(true);
    setParsedFiles([]);

    try {
      const res = await fetch("/api/drive/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memindai folder Google Drive.");
      }

      setDriveFolderId(data.folderId);
      setParsedFiles(data.files || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membaca folder Google Drive.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !clientName.trim() || !driveUrl.trim()) {
      setErrorMsg("Mohon lengkapi judul acara, nama klien, dan tautan Google Drive.");
      return;
    }

    if (parsedFiles.length === 0) {
      setErrorMsg("Silakan klik 'Periksa & Ambil Foto' terlebih dahulu untuk memastikan foto terbaca.");
      return;
    }

    setErrorMsg("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          client_name: clientName,
          drive_folder_url: driveUrl,
          drive_folder_id: driveFolderId || "folder-custom",
          max_selection: Number(maxSelection) || 50,
          deadline_date: deadlineDate || null,
          files: parsedFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat galeri.");
      }

      setSuccessCode(data.gallery.gallery_code);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan galeri.");
    } finally {
      setIsSaving(false);
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
            ← Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-widest font-bold">
            <span>Inisialisasi Projek</span>
            <span>·</span>
            <span>Limz Photography</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium mt-1">Buat Galeri Seleksi Baru</h1>
          <p className="text-sm text-obsidian-muted mt-1">
            Hubungkan folder Google Drive publik untuk menghasilkan tautan seleksi mandiri bagi klien.
          </p>
        </div>

        {/* SUCCESS MODAL POPUP */}
        {successCode && (
          <div className="p-6 mb-8 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-2xl font-semibold text-emerald-300">
                  Galeri Berhasil Dibuat!
                </h2>
                <p className="text-sm text-emerald-200/80 mt-1">
                  Kode Galeri Resmi: <span className="font-mono font-bold text-gold">{successCode}</span>
                </p>
                <p className="text-xs text-emerald-200/60 mt-2">
                  Tautan siap dibagikan ke klien. Klien dapat langsung membuka tautan ini lewat ponsel pintar untuk memilih foto.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <Link
                    href={`/g/${successCode}`}
                    target="_blank"
                    className="btn-gold px-5 py-2.5 rounded-full text-xs font-bold"
                  >
                    Buka Galeri Klien ↗
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-obsidian-surface border border-obsidian-line hover:border-gold transition-colors"
                  >
                    Ke Dashboard Studio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PANEL INFORMASI ACARA */}
          <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line">
            <h2 className="font-serif text-xl font-medium mb-4 text-obsidian-text">
              1. Informasi Sesi Foto & Klien
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-obsidian-muted uppercase tracking-wider mb-2">
                  Judul Acara / Galeri *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: The Wedding of Kevin & Vira"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-obsidian-muted uppercase tracking-wider mb-2">
                  Nama Klien *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Contoh: Kevin & Vira"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-obsidian-muted uppercase tracking-wider mb-2">
                  Batas Kuota Foto Terpilih *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(Number(e.target.value))}
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text focus:outline-none focus:border-gold transition-colors"
                />
                <p className="text-[11px] text-obsidian-faint mt-1">
                  Klien tidak dapat memilih melebihi angka kuota ini (Strict Limit).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-obsidian-muted uppercase tracking-wider mb-2">
                  Tanggal Batas Akhir (Deadline)
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>
          </div>

          {/* PANEL GOOGLE DRIVE */}
          <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-line">
            <h2 className="font-serif text-xl font-medium mb-1 text-obsidian-text">
              2. Sumber Foto (Google Drive)
            </h2>
            <p className="text-xs text-obsidian-muted mb-4">
              PilahFoto membaca langsung foto dari folder Google Drive Anda tanpa menyalin atau menyimpan file fisik di server web.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-obsidian-muted uppercase tracking-wider">
                Tautan Folder Google Drive Publik *
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/1abcXYZ..."
                  className="flex-1 bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-3 text-sm text-obsidian-text focus:outline-none focus:border-gold transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleScanDrive()}
                  disabled={isScanning || !driveUrl.trim()}
                  className="px-5 py-3 rounded-xl bg-obsidian-surface2 border border-gold/40 text-gold font-semibold text-xs hover:bg-gold hover:text-obsidian-bg transition-all whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isScanning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      Memindai...
                    </>
                  ) : (
                    "Periksa & Ambil Foto"
                  )}
                </button>
              </div>

              {/* PANDUAN DRIVE PUBLIK */}
              <details className="mt-2 text-xs text-obsidian-muted group">
                <summary className="cursor-pointer text-gold hover:underline flex items-center gap-1 font-medium">
                  <span>▸</span> Cara menyetel folder Google Drive agar publik
                </summary>
                <div className="mt-2 p-3 rounded-xl bg-obsidian-surface2/60 border border-obsidian-line text-obsidian-muted space-y-1 pl-4">
                  <p>1. Buka Google Drive di komputer atau browser HP Anda.</p>
                  <p>2. Klik kanan folder foto acara, lalu pilih <b>Bagikan → Bagikan</b>.</p>
                  <p>3. Di bagian &quot;Akses umum&quot;, ubah status dari Dibatasi menjadi <b>&quot;Siapa saja yang memiliki link&quot;</b>.</p>
                  <p>4. Klik <b>Salin link</b> dan tempelkan ke kolom input di atas.</p>
                </div>
              </details>
            </div>

            {/* PREVIEW HASIL SCAN FOTO */}
            {parsedFiles.length > 0 && (
              <div className="mt-6 pt-5 border-t border-obsidian-line">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Berhasil menemukan {parsedFiles.length} foto siap pilih
                  </span>
                  <span className="text-[11px] text-obsidian-faint">
                    Format: {parsedFiles[0]?.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-obsidian-surface2/50 rounded-xl border border-obsidian-line">
                  {parsedFiles.slice(0, 12).map((f) => (
                    <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-obsidian-line group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.thumbnailUrl}
                        alt={f.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-[9px] font-mono text-obsidian-text truncate text-center">
                        {f.name}
                      </div>
                    </div>
                  ))}
                  {parsedFiles.length > 12 && (
                    <div className="aspect-square rounded-lg bg-obsidian-surface2 border border-obsidian-line flex flex-col items-center justify-center text-xs text-obsidian-muted font-medium">
                      +{parsedFiles.length - 12}
                      <span className="text-[10px] text-obsidian-faint">foto lainnya</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full text-xs font-semibold bg-obsidian-surface border border-obsidian-line hover:border-gold transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSaving || parsedFiles.length === 0}
              className="btn-gold px-8 py-3 rounded-full text-sm font-bold disabled:opacity-40"
            >
              {isSaving ? "Menyimpan Galeri..." : "Simpan & Buat Galeri Seleksi →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewGalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian-bg p-20 text-center text-obsidian-muted">Memuat formulir...</div>}>
      <NewGalleryForm />
    </Suspense>
  );
}

