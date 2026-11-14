"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gallery, DriveParsedFile } from "@/lib/types";
import { generateDemoPhotos } from "@/lib/drive";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loadingGalleries, setLoadingGalleries] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Embedded "Buat Galeri Baru" Form States
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [driveUrl, setDriveUrl] = useState("");
  const [maxSelection, setMaxSelection] = useState<number>(50);
  const [timeLimitDays, setTimeLimitDays] = useState<string>("30");
  const [clientName, setClientName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [highlightDesc, setHighlightDesc] = useState("Your Story in Frames");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [pinCode, setPinCode] = useState("");
  const [extraPhotoPrice, setExtraPhotoPrice] = useState<number>(0);

  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<DriveParsedFile[]>([]);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Active QR Code modal state
  const [qrModalGallery, setQrModalGallery] = useState<Gallery | null>(null);

  const fetchGalleries = async () => {
    try {
      setLoadingGalleries(true);
      const res = await fetch("/api/galleries");
      const data = await res.json();
      if (data.galleries) {
        setGalleries(data.galleries);
      }
    } catch (err) {
      console.error("Gagal memuat galeri:", err);
    } finally {
      setLoadingGalleries(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  // Quick 12 Demo Photos Loader
  const handleUseDemoPhotos = () => {
    const demo = generateDemoPhotos();
    setParsedFiles(demo);
    setDriveFolderId("demo-photography-set");
    if (!driveUrl) setDriveUrl("https://drive.google.com/drive/folders/1fCpVKBotLKaCF2Tf92UGzWkp3vFtwOt-");
    if (!clientName) setClientName("Wisuda Nisa");
    if (!eventDate) setEventDate(new Date().toISOString().split("T")[0]);
    if (!clientWhatsapp) setClientWhatsapp("081352869000");
    setFormError("");
  };

  // Scan Google Drive Folder
  const handleScanDrive = async () => {
    if (!driveUrl.trim()) {
      setFormError("Masukkan tautan folder Google Drive terlebih dahulu.");
      return;
    }

    setFormError("");
    setIsScanning(true);

    try {
      const res = await fetch("/api/drive/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: driveUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memindai folder Google Drive.");
      }

      setDriveFolderId(data.folderId || "folder-drive");
      setParsedFiles(data.files || []);
      if (data.folderName && !clientName) {
        setClientName(data.folderName);
      }
    } catch (err: any) {
      setFormError(err.message || "Gagal membaca folder Google Drive.");
    } finally {
      setIsScanning(false);
    }
  };

  // Submit Embedded Gallery
  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(null);

    let filesToSave = parsedFiles;

    // Auto-scan if user hasn't clicked scan button yet
    if (filesToSave.length === 0) {
      if (!driveUrl.trim()) {
        setFormError("Masukkan tautan Google Drive atau klik tombol 'Gunakan 12 Foto Contoh'.");
        return;
      }
      setIsCreating(true);
      try {
        const scanRes = await fetch("/api/drive/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderUrl: driveUrl.trim() }),
        });
        const scanData = await scanRes.json();
        if (!scanRes.ok || !scanData.files || scanData.files.length === 0) {
          throw new Error("Folder Google Drive tidak berisi foto atau belum di-set publik.");
        }
        filesToSave = scanData.files;
        setParsedFiles(filesToSave);
      } catch (err: any) {
        setFormError(err.message || "Gagal membaca foto Google Drive.");
        setIsCreating(false);
        return;
      }
    }

    const finalClientName = clientName.trim() || "Klien Limz Photography";
    const finalTitle = finalClientName;

    setIsCreating(true);
    try {
      // Calculate deadline date from dropdown days
      let calculatedDeadline = "";
      if (timeLimitDays && timeLimitDays !== "unlimited") {
        const days = parseInt(timeLimitDays, 10);
        const d = new Date();
        d.setDate(d.getDate() + days);
        calculatedDeadline = d.toISOString().split("T")[0];
      }

      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          client_name: finalClientName,
          drive_folder_url: driveUrl.trim(),
          drive_folder_id: driveFolderId || "drive-folder",
          max_selection: Number(maxSelection) || 50,
          deadline_date: calculatedDeadline || undefined,
          pin_code: pinCode.trim() || undefined,
          extra_photo_price: Number(extraPhotoPrice) || 0,
          client_whatsapp: clientWhatsapp.replace(/[^0-9]/g, ""),
          event_date: eventDate || undefined,
          allow_download: allowDownload,
          highlight_desc: highlightDesc || "Your Story in Frames",
          time_limit_days: timeLimitDays !== "unlimited" ? parseInt(timeLimitDays, 10) : undefined,
          files: filesToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat galeri.");
      }

      setFormSuccess(data.gallery.gallery_code);
      fetchGalleries();

      // Reset form fields
      setDriveUrl("");
      setClientName("");
      setEventDate("");
      setClientWhatsapp("");
      setParsedFiles([]);
      setDriveFolderId("");
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan galeri.");
    } finally {
      setIsCreating(false);
    }
  };

  const copyClientLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const clientUrl = `${origin}/g/${code}`;
    navigator.clipboard.writeText(clientUrl);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteGallery = async (code: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus galeri "${title}" (${code})?`)) return;

    try {
      const res = await fetch(`/api/galleries/${code}`, { method: "DELETE" });
      if (res.ok) {
        fetchGalleries();
      } else {
        alert("Gagal menghapus galeri.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    }
  };

  const activeCount = galleries.filter((g) => g.status === "active").length;
  const submittedCount = galleries.filter((g) => g.status === "submitted").length;

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text selection:bg-gold selection:text-obsidian-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* TOP BAR / SUB NAVIGATION */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-obsidian-line">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-obsidian-text">
              PilahFoto
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/30 font-semibold uppercase tracking-wider">
              for photographers
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
            <span className="text-gold font-bold px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30">
              Galeri
            </span>
            <Link
              href="/#demo"
              className="text-obsidian-muted hover:text-gold px-3 py-1.5 rounded-lg hover:bg-obsidian-surface2 transition-colors"
            >
              Portofolio Studio
            </Link>
            <Link
              href="/dashboard/picker"
              className="text-obsidian-muted hover:text-gold px-3 py-1.5 rounded-lg hover:bg-obsidian-surface2 transition-colors flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Web Picker RAW
            </Link>
            <span className="text-obsidian-faint px-3 py-1.5 rounded-lg cursor-not-allowed hidden sm:inline">
              Sortir Otomatis
            </span>
          </nav>
        </div>

        {/* QUICK TOOL BANNER CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
          {/* Tool 1 */}
          <Link
            href="/dashboard/picker"
            className="p-3.5 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all group flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0 group-hover:bg-gold group-hover:text-obsidian-bg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-obsidian-text">PilahFoto Picker</h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/20 text-gold font-bold">RAW</span>
              </div>
              <p className="text-[11px] text-obsidian-muted mt-0.5 leading-snug">
                Salin file RAW asli ke laptop & filter Lightroom otomatis.
              </p>
            </div>
          </Link>

          {/* Tool 2 */}
          <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-obsidian-line flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-obsidian-text">Studio Job & POS</h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-obsidian-surface2 text-obsidian-muted">Aktif</span>
              </div>
              <p className="text-[11px] text-obsidian-muted mt-0.5 leading-snug">
                Kirim invoice & rekap booking langsung via WhatsApp.
              </p>
            </div>
          </div>

          {/* Tool 3 */}
          <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-obsidian-line flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-obsidian-text">Domain Portofolio</h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/20 text-gold font-bold">Limz</span>
              </div>
              <p className="text-[11px] text-obsidian-muted mt-0.5 leading-snug">
                Portofolio eksklusif bermerek Limz Photography.
              </p>
            </div>
          </div>

          {/* Tool 4 */}
          <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-obsidian-line flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-obsidian-text">Kamera Tamu (Live QR)</h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/20 text-gold font-bold">Pro</span>
              </div>
              <p className="text-[11px] text-obsidian-muted mt-0.5 leading-snug">
                QR cetak kartu meja untuk tamu unggah foto live.
              </p>
            </div>
          </div>
        </div>

        {/* EMBEDDED FORM: BUAT GALERI BARU */}
        <section className="bg-obsidian-surface border border-obsidian-line rounded-3xl p-5 sm:p-7 shadow-2xl my-6">
          <div className="flex items-center justify-between pb-4 border-b border-obsidian-line/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <h2 className="font-serif text-xl sm:text-2xl font-medium text-obsidian-text">
                Buat Galeri Baru
              </h2>
            </div>
            <button
              type="button"
              onClick={handleUseDemoPhotos}
              className="text-xs px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 hover:bg-gold hover:text-obsidian-bg transition-all font-semibold flex items-center gap-1"
            >
              <span>⚡ Gunakan 12 Foto Contoh</span>
            </button>
          </div>

          <form onSubmit={handleCreateGallery} className="mt-6 space-y-5">
            {/* GOOGLE DRIVE LINK */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold tracking-wider text-obsidian-muted uppercase">
                  Link Folder Google Drive <span className="text-gold">*</span>
                </label>
                <span className="text-[11px] text-obsidian-faint">
                  Folder harus di-share "Anyone with the link can view"
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={driveUrl}
                  onChange={(e) => {
                    setDriveUrl(e.target.value);
                    setFormError("");
                  }}
                  placeholder="https://drive.google.com/drive/folders/1fCpVKBotLKaCF2Tf92UGzWkp3vFtwOt-..."
                  className="flex-1 bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text placeholder:text-obsidian-faint focus:outline-none focus:border-gold transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={handleScanDrive}
                  disabled={isScanning || !driveUrl.trim()}
                  className="px-5 py-2.5 rounded-xl border border-gold/40 text-gold hover:bg-gold hover:text-obsidian-bg text-xs font-bold whitespace-nowrap transition-all disabled:opacity-40"
                >
                  {isScanning ? "Memeriksa..." : "Periksa & Ambil Foto"}
                </button>
              </div>
            </div>

            {/* PREVIEW OF PARSED PHOTOS */}
            {parsedFiles.length > 0 && (
              <div className="bg-obsidian-surface2 border border-obsidian-line rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Berhasil memuat {parsedFiles.length} foto siap pilih
                  </span>
                  <button
                    type="button"
                    onClick={() => setParsedFiles([])}
                    className="text-red-400 hover:underline"
                  >
                    Hapus / Ganti
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {parsedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-obsidian-line bg-obsidian-bg group"
                    >
                      <img
                        src={`/api/image-proxy?id=${file.id}&w=200`}
                        alt={file.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes("&retry=1")) {
                            target.src = target.src + "&retry=1";
                          }
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[9px] truncate text-center font-mono">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ROW 1: KUOTA & DEADLINE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  Batas Maksimal Foto Dipilih Klien <span className="text-gold">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(parseInt(e.target.value, 10) || 50)}
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  Batas Waktu Klien Memilih
                </label>
                <select
                  value={timeLimitDays}
                  onChange={(e) => setTimeLimitDays(e.target.value)}
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text focus:outline-none focus:border-gold"
                >
                  <option value="7">7 hari</option>
                  <option value="14">14 hari</option>
                  <option value="30">30 hari (Direkomendasikan)</option>
                  <option value="unlimited">Tanpa batas waktu</option>
                </select>
                <p className="text-[11px] text-obsidian-faint mt-1">
                  Kasih batas waktu agar klien segera memilih foto. Bisa diubah kapan saja.
                </p>
              </div>
            </div>

            {/* ROW 2: NAMA KLIEN & TANGGAL ACARA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  Nama Klien / Acara
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Contoh: Wisuda Nisa / Kevin & Vira"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text placeholder:text-obsidian-faint focus:outline-none focus:border-gold"
                />
                <p className="text-[11px] text-obsidian-faint mt-1">
                  Dipakai sebagai judul galeri dan album kenangan klien.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  Tanggal Acara
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text focus:outline-none focus:border-gold"
                />
                <p className="text-[11px] text-obsidian-faint mt-1">
                  Tampil di halaman sampul dan highlight album klien.
                </p>
              </div>
            </div>

            {/* ROW 3: DESKRIPSI HIGHLIGHT & WHATSAPP KLIEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  Deskripsi / Highlight
                </label>
                <input
                  type="text"
                  value={highlightDesc}
                  onChange={(e) => setHighlightDesc(e.target.value)}
                  placeholder="Your Story in Frames"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-obsidian-muted uppercase mb-1.5">
                  WhatsApp Klien <span className="text-gold">*</span>
                </label>
                <input
                  type="tel"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-obsidian-text focus:outline-none focus:border-gold"
                />
                <p className="text-[11px] text-obsidian-faint mt-1">
                  Untuk tombol 1-klik kirim link galeri langsung ke WhatsApp klien.
                </p>
              </div>
            </div>

            {/* ROW 4: ADVANCED OPTIONS (DOWNLOAD & PIN & UPSELL) */}
            <div className="pt-2 border-t border-obsidian-line/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-obsidian-text pt-2">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 rounded border-obsidian-line text-gold focus:ring-gold bg-obsidian-surface2"
                />
                <span>Izinkan klien mengunduh foto</span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-obsidian-muted uppercase mb-1">
                  Proteksi PIN 4-Digit (Opsional)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Contoh: 1234"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-lg px-3 py-1.5 text-xs text-obsidian-text text-center tracking-widest font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-obsidian-muted uppercase mb-1">
                  Biaya per Foto Ekstra (Upsell Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={extraPhotoPrice}
                  onChange={(e) => setExtraPhotoPrice(parseInt(e.target.value, 10) || 0)}
                  placeholder="0 (Tanpa tambahan biaya)"
                  className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-lg px-3 py-1.5 text-xs text-obsidian-text text-center"
                />
              </div>
            </div>

            {/* FORM ERROR & SUCCESS */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center justify-between">
                <span>✓ Galeri <strong>{formSuccess}</strong> berhasil dibuat dan siap dibagikan!</span>
                <Link href={`/g/${formSuccess}`} target="_blank" className="underline font-bold text-emerald-200">
                  Buka Galeri ↗
                </Link>
              </div>
            )}

            {/* ACTION BUTTON */}
            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="btn-gold px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-obsidian-bg border-t-transparent rounded-full animate-spin" />
                    Menyimpan Galeri...
                  </>
                ) : (
                  <>
                    <span>Simpan & Buat Galeri Seleksi</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION: SEMUA GALERI */}
        <div className="mt-12">
          <div className="flex items-center justify-between pb-4 border-b border-obsidian-line">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-2xl font-medium text-obsidian-text">
                Semua Galeri
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-obsidian-surface2 border border-obsidian-line text-obsidian-muted font-bold font-mono">
                {galleries.length} galeri
              </span>
            </div>
            <div className="text-xs text-obsidian-faint hidden sm:block">
              {activeCount} Aktif · {submittedCount} Selesai Dipilih
            </div>
          </div>

          {loadingGalleries ? (
            <div className="py-20 text-center text-obsidian-muted text-sm">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Memuat daftar galeri studio...
            </div>
          ) : galleries.length === 0 ? (
            <div className="py-16 text-center bg-obsidian-surface/40 border border-obsidian-line rounded-3xl mt-4">
              <p className="font-serif text-lg text-obsidian-muted">Belum ada galeri yang dibuat.</p>
              <p className="text-xs text-obsidian-faint mt-1">
                Gunakan formulir di atas untuk membuat galeri seleksi pertama Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {galleries.map((gallery) => {
                const isSubmitted = gallery.status === "submitted";
                const selected = gallery.selected_count || 0;
                const max = gallery.max_selection || 50;
                const totalPhotos = gallery.photo_count || 0;
                const percent = Math.min(100, Math.round((selected / max) * 100));

                const initials = (gallery.client_name || gallery.title || "G")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const clientUrl = `${origin}/g/${gallery.gallery_code}`;
                const memoriesUrl = `${origin}/memories/${gallery.gallery_code}`;

                // WhatsApp Share Link
                const waNumber = (gallery.client_whatsapp || "").replace(/[^0-9]/g, "");
                const waText = encodeURIComponent(
                  `Halo Kak ${gallery.client_name || "Klien"},\n\n` +
                  `Berikut link seleksi foto untuk ${gallery.title}:\n` +
                  `${clientUrl}\n\n` +
                  `Silakan pilih hingga ${gallery.max_selection} foto langsung dari HP Anda.\n` +
                  `Terima kasih! ✨\n— Limz Photography`
                );
                const waUrl = waNumber
                  ? `https://wa.me/${waNumber.startsWith("0") ? "62" + waNumber.slice(1) : waNumber}?text=${waText}`
                  : `https://wa.me/?text=${waText}`;

                return (
                  <div
                    key={gallery.id}
                    className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-line hover:border-gold/50 transition-all duration-200"
                  >
                    {/* TOP ROW: AVATAR + INFO + ACTION ICONS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Avatar & Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 text-gold font-serif text-lg font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif text-lg font-bold text-obsidian-text">
                              {gallery.client_name || gallery.title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-obsidian-surface2 border border-obsidian-line text-gold">
                              {gallery.gallery_code}
                            </span>
                            {isSubmitted ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
                                ✓ Selesai Dipilih
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 font-bold">
                                Sedang Memilih
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-obsidian-muted mt-1">
                            <span>Maks {max} foto</span>
                            <span>·</span>
                            <span>{totalPhotos} foto di Drive</span>
                            {gallery.event_date && (
                              <>
                                <span>·</span>
                                <span>Acara: {gallery.event_date}</span>
                              </>
                            )}
                            {gallery.client_whatsapp && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400">WA: {gallery.client_whatsapp}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                        {/* Open Client Gallery */}
                        <Link
                          href={`/g/${gallery.gallery_code}`}
                          target="_blank"
                          title="Buka Galeri Klien"
                          className="px-3 py-1.5 rounded-lg bg-obsidian-surface2 hover:bg-gold/15 hover:text-gold border border-obsidian-line text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Buka Klien</span>
                          <span>↗</span>
                        </Link>

                        {/* Open Memories Album */}
                        <Link
                          href={`/memories/${gallery.gallery_code}`}
                          target="_blank"
                          title="Mode Kenangan / Wedding Album"
                          className="px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold hover:text-obsidian-bg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>✨ Kenangan</span>
                        </Link>

                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => copyClientLink(gallery.gallery_code)}
                          title="Salin Tautan Klien"
                          className="p-2 rounded-lg bg-obsidian-surface2 hover:bg-obsidian-surface2/80 border border-obsidian-line text-obsidian-muted hover:text-gold transition-colors text-xs"
                        >
                          {copiedId === gallery.gallery_code ? "✓ Tersalin" : "🔗 Salin"}
                        </button>

                        {/* WhatsApp Invite */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Kirim Link via WhatsApp"
                          className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 transition-colors text-xs flex items-center gap-1 font-semibold"
                        >
                          <span>💬 WA</span>
                        </a>

                        {/* QR Code Popup */}
                        <button
                          type="button"
                          onClick={() => setQrModalGallery(gallery)}
                          title="Tampilkan QR Code"
                          className="p-2 rounded-lg bg-obsidian-surface2 border border-obsidian-line text-obsidian-muted hover:text-gold transition-colors text-xs"
                        >
                          📱 QR
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteGallery(gallery.gallery_code, gallery.title)}
                          title="Hapus Galeri"
                          className="p-2 rounded-lg hover:bg-red-950/40 border border-transparent hover:border-red-800/40 text-obsidian-faint hover:text-red-400 transition-colors text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="mt-4 pt-3 border-t border-obsidian-line/60">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-obsidian-muted">
                          Progres Pilihan Klien: <strong>{selected}</strong> dari {max} foto ({percent}%)
                        </span>
                        {gallery.deadline_date && (
                          <span className="text-obsidian-faint text-[11px]">
                            Batas Waktu: {gallery.deadline_date}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-obsidian-surface2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isSubmitted ? "bg-emerald-400" : "bg-gold"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* 4 SPECIAL STUDIO BUTTONS AT BOTTOM OF CARD */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <Link
                        href={`/memories/${gallery.gallery_code}`}
                        target="_blank"
                        className="py-1.5 px-2 rounded-lg bg-obsidian-surface2 hover:bg-obsidian-surface2/80 border border-obsidian-line text-[11px] font-semibold text-center text-obsidian-text hover:text-gold transition-colors"
                      >
                        📖 Bikin Wedding Book
                      </Link>

                      <Link
                        href={`/g/${gallery.gallery_code}`}
                        target="_blank"
                        className="py-1.5 px-2 rounded-lg bg-obsidian-surface2 hover:bg-obsidian-surface2/80 border border-obsidian-line text-[11px] font-semibold text-center text-obsidian-text hover:text-gold transition-colors"
                      >
                        🎨 Bikin Konten Foto (9:16)
                      </Link>

                      <Link
                        href={`/g/${gallery.gallery_code}`}
                        target="_blank"
                        className="py-1.5 px-2 rounded-lg bg-obsidian-surface2 hover:bg-obsidian-surface2/80 border border-obsidian-line text-[11px] font-semibold text-center text-obsidian-text hover:text-gold transition-colors"
                      >
                        🎬 Bikin Konten Reels
                      </Link>

                      <Link
                        href={`/dashboard/picker/${gallery.gallery_code}`}
                        className="py-1.5 px-2 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/30 text-[11px] font-bold text-center text-gold transition-colors"
                      >
                        ⚡ Web Picker RAW
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QR CODE POPUP MODAL */}
        {qrModalGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-obsidian-surface border border-obsidian-line rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative">
              <button
                type="button"
                onClick={() => setQrModalGallery(null)}
                className="absolute top-4 right-4 text-obsidian-muted hover:text-white p-1"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-bold uppercase mb-4">
                <span>QR Code Tamu & Klien</span>
              </div>

              <h3 className="font-serif text-xl font-medium mb-1">
                {qrModalGallery.client_name || qrModalGallery.title}
              </h3>
              <p className="text-xs text-obsidian-muted mb-5">
                Scan dari kamera HP untuk membuka galeri foto seketika.
              </p>

              {/* QR Image */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/g/${qrModalGallery.gallery_code}`
                  )}`}
                  alt={`QR ${qrModalGallery.gallery_code}`}
                  className="w-48 h-48 block"
                />
              </div>

              <p className="text-[11px] font-mono text-gold mb-5">
                Kode: {qrModalGallery.gallery_code}
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    navigator.clipboard.writeText(`${origin}/g/${qrModalGallery.gallery_code}`);
                    alert("Tautan galeri berhasil disalin!");
                  }}
                  className="btn-gold w-full py-2.5 rounded-xl text-xs font-bold"
                >
                  Salin Tautan Galeri
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalGallery(null)}
                  className="w-full py-2 text-xs text-obsidian-muted hover:text-obsidian-text"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
