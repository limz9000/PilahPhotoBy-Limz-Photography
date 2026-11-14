"use client";

import { use, useEffect, useState, useMemo } from "react";
import confetti from "canvas-confetti";
import { Gallery, Photo, Studio } from "@/lib/types";

interface ClientGalleryProps {
  params: Promise<{ code: string }>;
}

export default function ClientGalleryPage({ params }: ClientGalleryProps) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI States
  const [activeTab, setActiveTab] = useState<"all" | "selected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);

  // Fullscreen Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Submit Modal & Lock
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/galleries/${code}`);
        const data = await res.json();
        if (data.gallery) {
          setGallery(data.gallery);
          setStudio(data.studio);
          setPhotos(data.photos || []);
          setSelectedIds(new Set(data.selectedPhotoIds || []));
          if (data.gallery.status === "submitted") {
            setIsLocked(true);
          }
        }
      } catch (err) {
        console.error("Gagal memuat galeri:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [code]);

  // Toggle Selection
  const handleToggleSelect = async (photo: Photo) => {
    if (isLocked) {
      showToast("Galeri telah dikunci permanen.");
      return;
    }

    const isCurrentlySelected = selectedIds.has(photo.id);

    // Strict quota check on client before calling API
    if (!isCurrentlySelected && gallery && selectedIds.size >= gallery.max_selection) {
      showToast(`Batas maksimal pilihan (${gallery.max_selection} foto) sudah penuh.`);
      return;
    }

    // Optimistic UI update
    const updated = new Set(selectedIds);
    if (isCurrentlySelected) {
      updated.delete(photo.id);
    } else {
      updated.add(photo.id);
    }
    setSelectedIds(updated);

    try {
      const res = await fetch(`/api/galleries/${code}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id }),
      });

      if (!res.ok) {
        const errData = await res.json();
        // Rollback on error
        setSelectedIds(selectedIds);
        showToast(errData.error || "Gagal mengubah pilihan.");
      }
    } catch (err: any) {
      setSelectedIds(selectedIds);
      showToast("Terjadi kendala jaringan.");
    }
  };

  // Submit Final Selections
  const handleConfirmSubmit = async () => {
    if (!gallery) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/galleries/${code}/submit`, {
        method: "POST",
      });

      if (res.ok) {
        setIsLocked(true);
        setShowSubmitModal(false);
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#c9a96e", "#ffffff", "#4caf7d"],
        });
        showToast("Pilihan foto Anda berhasil dikunci & dikirim!");
      }
    } catch (err) {
      showToast("Gagal mengirimkan pilihan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Message Generator
  const getWhatsAppShareLink = () => {
    if (!studio || !gallery) return "#";
    const waNumber = studio.whatsapp.replace(/[^0-9]/g, "");
    const selectedList = photos
      .filter((p) => selectedIds.has(p.id))
      .map((p, idx) => `${idx + 1}. ${p.file_name}`)
      .join("\n");

    const text = `Halo ${studio.name}, saya *${gallery.client_name}* telah selesai memilih *${selectedIds.size} foto* untuk galeri *${gallery.title}* (Kode: ${gallery.gallery_code}).

Berikut daftar nama file foto pilihan kami:
${selectedList}

Terima kasih banyak!`;

    return `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(text)}`;
  };

  // Filtered Photos List
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchesSearch = p.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === "selected") {
        return matchesSearch && selectedIds.has(p.id);
      }
      return matchesSearch;
    });
  }, [photos, searchQuery, activeTab, selectedIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-medium">Membuka Galeri Kenangan...</h2>
        <p className="text-xs text-obsidian-muted mt-1">Mengambil foto langsung dari Google Drive</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-serif text-3xl font-medium text-red-400">Galeri Tidak Ditemukan</h2>
        <p className="text-xs text-obsidian-muted mt-2">
          Pastikan tautan atau kode galeri yang Anda buka sudah benar.
        </p>
      </div>
    );
  }

  const maxQuota = gallery.max_selection;
  const currentCount = selectedIds.size;
  const quotaPercent = Math.min(100, Math.round((currentCount / maxQuota) * 100));

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text pb-28 selection:bg-gold selection:text-obsidian-bg">
      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-obsidian-surface border border-gold/60 text-gold text-xs font-semibold shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* STICKY CLIENT HEADER */}
      <header className="sticky top-0 z-40 glass-header px-4 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gold uppercase tracking-wider block truncate">
              {studio?.name || "Limz Photography"}
            </span>
            <h1 className="font-serif text-lg sm:text-2xl font-medium truncate text-obsidian-text">
              {gallery.title}
            </h1>
          </div>

          {/* REAL-TIME PILL COUNTER (ZETTBOT SPEC) */}
          <div className="shrink-0 flex items-center gap-2 bg-obsidian-surface2 border border-obsidian-line rounded-full px-3.5 py-1.5 shadow-md">
            <div className="text-center">
              <span className="font-serif text-lg sm:text-xl font-bold text-gold tabular-nums leading-none">
                {currentCount}
              </span>
              <span className="text-xs text-obsidian-muted font-normal"> / {maxQuota}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="max-w-6xl mx-auto mt-2 h-1 bg-obsidian-line rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-300"
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
      </header>

      {/* LOCKED NOTIFICATION BANNER */}
      {isLocked && (
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-4 py-2.5 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Pilihan Anda telah dikunci dan tersimpan. Terima kasih!
        </div>
      )}

      {/* TOOLBAR & FILTER TABS */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-obsidian-line/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-gold text-obsidian-bg font-bold shadow-md"
                : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
            }`}
          >
            Semua Foto ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab("selected")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "selected"
                ? "bg-gold text-obsidian-bg font-bold shadow-md"
                : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
            }`}
          >
            Foto Terpilih ({currentCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor file..."
              className="w-full bg-obsidian-surface border border-obsidian-line rounded-full pl-8 pr-3 py-1.5 text-xs text-obsidian-text placeholder:text-obsidian-faint focus:outline-none focus:border-gold"
            />
            <svg
              className="w-3.5 h-3.5 text-obsidian-muted absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* TOGGLE SWIPE MODE */}
          <button
            onClick={() => {
              setIsSwipeMode(!isSwipeMode);
              setSwipeIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all whitespace-nowrap ${
              isSwipeMode
                ? "bg-gold/20 text-gold border-gold"
                : "bg-obsidian-surface text-obsidian-muted border-obsidian-line hover:text-gold"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {isSwipeMode ? "Kembali ke Grid" : "Mode Geser (Swipe)"}
          </button>
        </div>
      </div>

      {/* GALLERY CONTENT */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        {filteredPhotos.length === 0 ? (
          <div className="p-16 text-center text-obsidian-muted">
            <p className="font-serif text-xl">Tidak ada foto yang cocok.</p>
            {activeTab === "selected" && (
              <p className="text-xs mt-1">Anda belum memilih foto apapun. Silakan kembali ke tab Semua Foto.</p>
            )}
          </div>
        ) : isSwipeMode ? (
          /* ============================================================== */
          /* MODE GESER (SWIPE MODE ALA TINDER)                              */
          /* ============================================================== */
          <div className="max-w-md mx-auto my-6 px-4">
            <div className="text-center text-xs text-obsidian-muted mb-3 flex items-center justify-between">
              <span>Mode Swipe Layar Sentuh</span>
              <span className="font-mono text-gold">
                {swipeIndex + 1} dari {filteredPhotos.length}
              </span>
            </div>

            {filteredPhotos[swipeIndex] && (
              <div className="relative rounded-2xl overflow-hidden bg-obsidian-surface border border-obsidian-line shadow-2xl aspect-[3/4] flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filteredPhotos[swipeIndex].thumbnail_url}
                  alt={filteredPhotos[swipeIndex].file_name}
                  className="w-full h-full object-contain bg-black"
                />

                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-mono text-obsidian-text">
                  {filteredPhotos[swipeIndex].file_name}
                </div>

                {selectedIds.has(filteredPhotos[swipeIndex].id) && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center gap-1 shadow-lg">
                    ✓ TERPILIH
                  </div>
                )}
              </div>
            )}

            {/* SWIPE ACTION BUTTONS */}
            <div className="flex items-center justify-center gap-6 mt-6">
              {/* Tombol Lewati (Skip) */}
              <button
                onClick={() => {
                  if (swipeIndex < filteredPhotos.length - 1) {
                    setSwipeIndex(swipeIndex + 1);
                  } else {
                    showToast("Sudah di foto terakhir!");
                  }
                }}
                className="w-14 h-14 rounded-full bg-obsidian-surface border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-lg shadow-xl transition-all"
                title="Lewati"
              >
                ✕
              </button>

              {/* Tombol Pilih / Batal Pilih (Pick) */}
              <button
                onClick={() => {
                  const currentPhoto = filteredPhotos[swipeIndex];
                  if (currentPhoto) {
                    handleToggleSelect(currentPhoto);
                    // auto advance if chosen
                    if (!selectedIds.has(currentPhoto.id) && swipeIndex < filteredPhotos.length - 1) {
                      setTimeout(() => setSwipeIndex(swipeIndex + 1), 200);
                    }
                  }
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all ${
                  filteredPhotos[swipeIndex] && selectedIds.has(filteredPhotos[swipeIndex].id)
                    ? "bg-gold text-obsidian-bg scale-105"
                    : "bg-obsidian-surface border border-gold/50 text-gold hover:bg-gold hover:text-obsidian-bg"
                }`}
                title="Pilih Foto Ini"
              >
                ✓
              </button>

              {/* Tombol Selanjutnya */}
              <button
                onClick={() => {
                  if (swipeIndex > 0) {
                    setSwipeIndex(swipeIndex - 1);
                  }
                }}
                disabled={swipeIndex === 0}
                className="w-12 h-12 rounded-full bg-obsidian-surface border border-obsidian-line text-obsidian-muted disabled:opacity-30 flex items-center justify-center text-xs"
                title="Foto Sebelumnya"
              >
                ◀
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MODE JUSTIFIED GRID PROPORSIONAL (TANPA TEKS KEPOTONG)         */
          /* ============================================================== */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-xl overflow-hidden bg-obsidian-surface border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-gold ring-2 ring-gold/40 shadow-xl"
                      : "border-obsidian-line/80 hover:border-gold/40"
                  }`}
                  onClick={() => setPreviewPhoto(photo)}
                >
                  {/* Photo Thumbnail */}
                  <div className="aspect-[4/3] w-full overflow-hidden bg-obsidian-line relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* SELECT CHECKBOX BUTTON (TAP TARGET) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(photo);
                      }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-lg ${
                        isSelected
                          ? "bg-gold text-obsidian-bg font-bold scale-105"
                          : "bg-black/60 backdrop-blur-md text-white/70 hover:text-white border border-white/20"
                      }`}
                      aria-label="Pilih foto"
                    >
                      {isSelected ? "✓" : "+"}
                    </button>
                  </div>

                  {/* Photo Metadata Bar (ZettBOT Anti-Teks Kepotong) */}
                  <div className="p-2 sm:p-2.5 bg-obsidian-surface flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] sm:text-xs text-obsidian-muted truncate max-w-[130px]">
                      {photo.file_name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                        Dipilih
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="flex items-center justify-between text-xs text-obsidian-muted pb-2">
            <span className="font-mono text-obsidian-text">{previewPhoto.file_name}</span>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="text-white hover:text-gold text-sm px-3 py-1 rounded-full bg-white/10"
            >
              ✕ Tutup
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden my-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.thumbnail_url}
              alt={previewPhoto.file_name}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div
            className="flex items-center justify-center gap-4 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleToggleSelect(previewPhoto)}
              className={`px-8 py-3 rounded-full text-xs font-bold transition-all shadow-2xl flex items-center gap-2 ${
                selectedIds.has(previewPhoto.id)
                  ? "bg-gold text-obsidian-bg"
                  : "bg-obsidian-surface border border-gold text-gold"
              }`}
            >
              {selectedIds.has(previewPhoto.id) ? "✓ Foto Ini Sudah Terpilih" : "+ Pilih Foto Ini"}
            </button>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-obsidian-surface/95 backdrop-blur-xl border-t border-obsidian-line px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-obsidian-text">
              <span className="text-gold font-bold text-sm sm:text-base">{currentCount}</span> / {maxQuota} Foto Terpilih
            </div>
            <div className="text-[11px] text-obsidian-faint">
              {currentCount >= maxQuota
                ? "Kuota maksimal terpenuhi"
                : `Masih bisa memilih ${maxQuota - currentCount} foto lagi`}
            </div>
          </div>

          {isLocked ? (
            <a
              href={getWhatsAppShareLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold px-6 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2"
            >
              Kirim Rekap ke WhatsApp ↗
            </a>
          ) : (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={currentCount === 0}
              className="btn-gold px-6 py-2.5 rounded-full text-xs font-bold disabled:opacity-40"
            >
              Kirim Pilihan ({currentCount}) →
            </button>
          )}
        </div>
      </div>

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-obsidian-surface border border-obsidian-line rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-serif text-2xl font-semibold text-obsidian-text">
              Kunci & Kirim Pilihan Foto?
            </h3>
            <p className="text-xs text-obsidian-muted mt-2 leading-relaxed">
              Anda telah memilih <b className="text-gold">{currentCount} foto</b> dari kuota {maxQuota}. Setelah Anda mengonfirmasi, galeri akan <b>dikunci permanen</b> untuk menghindari perubahan, dan kami akan mengarahkan Anda ke WhatsApp {studio?.name || "Limz Photography"}.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-obsidian-line">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-full text-xs text-obsidian-muted hover:text-obsidian-text"
              >
                Periksa Lagi
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="btn-gold px-6 py-2.5 rounded-full text-xs font-bold"
              >
                {isSubmitting ? "Mengunci..." : "Ya, Kunci & Kirim Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

