"use client";

import { use, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import JSZip from "jszip";
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

  // Photo Notes State: photoId -> note text
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [activeNotePhoto, setActiveNotePhoto] = useState<Photo | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // PIN Protection State
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  // UI Tabs & Modes
  const [activeTab, setActiveTab] = useState<"all" | "selected" | "magazine">("all");
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

  // Story & ZIP Modals
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyPhotos, setStoryPhotos] = useState<Photo[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial load
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

          // Populate notes map from photos
          const notesMap: Record<string, string> = {};
          (data.photos || []).forEach((p: Photo) => {
            if (p.notes) notesMap[p.id] = p.notes;
          });
          setPhotoNotes(notesMap);

          if (data.gallery.status === "submitted") {
            setIsLocked(true);
          }

          // Check PIN lock
          if (!data.gallery.pin_code) {
            setIsPinUnlocked(true);
          } else {
            const savedPinStatus = sessionStorage.getItem(`pin_unlocked_${code}`);
            if (savedPinStatus === "true") {
              setIsPinUnlocked(true);
            }
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

  // Robust Image URL Helper (Uses local proxy to bypass Google cross-origin restrictions)
  const getImageUrl = (photo: Photo, width = 800) => {
    if (photo.drive_file_id && !photo.drive_file_id.startsWith("demo-")) {
      return `/api/image-proxy?id=${photo.drive_file_id}&w=${width}`;
    }
    return photo.thumbnail_url;
  };

  // PIN Unlock Verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery?.pin_code) {
      setIsPinUnlocked(true);
      return;
    }
    if (pinInput.trim() === gallery.pin_code.trim()) {
      setIsPinUnlocked(true);
      sessionStorage.setItem(`pin_unlocked_${code}`, "true");
      setPinError("");
      showToast("PIN Berhasil! Selamat datang di galeri Anda.");
    } else {
      setPinError("PIN yang Anda masukkan salah. Silakan coba lagi.");
    }
  };

  // Extra Quota & Calculation
  const maxQuota = gallery?.max_selection || 50;
  const extraPrice = gallery?.extra_photo_price || 0;
  const allowExtra = gallery?.allow_extra_selection || extraPrice > 0;
  const currentCount = selectedIds.size;
  const extraCount = Math.max(0, currentCount - maxQuota);
  const extraTotalCost = extraCount * extraPrice;
  const quotaPercent = Math.min(100, Math.round((currentCount / maxQuota) * 100));

  // Toggle Selection
  const handleToggleSelect = async (photo: Photo) => {
    if (isLocked) {
      showToast("Galeri telah dikunci permanen.");
      return;
    }

    const isCurrentlySelected = selectedIds.has(photo.id);

    // Strict quota check if extra selection is not enabled
    if (!isCurrentlySelected && !allowExtra && currentCount >= maxQuota) {
      showToast(`Batas maksimal pilihan (${maxQuota} foto) sudah penuh.`);
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
        setSelectedIds(selectedIds);
        showToast(errData.error || "Gagal mengubah pilihan.");
      }
    } catch (err: any) {
      setSelectedIds(selectedIds);
      showToast("Terjadi kendala jaringan.");
    }
  };

  // Save Note for Photo
  const handleOpenNoteModal = (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveNotePhoto(photo);
    setTempNoteText(photoNotes[photo.id] || photo.notes || "");
  };

  const handleSaveNote = async () => {
    if (!activeNotePhoto) return;
    setIsSavingNote(true);

    try {
      const res = await fetch(`/api/galleries/${code}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: activeNotePhoto.id,
          notes: tempNoteText.trim(),
        }),
      });

      if (res.ok) {
        setPhotoNotes((prev) => ({
          ...prev,
          [activeNotePhoto.id]: tempNoteText.trim(),
        }));
        showToast("Catatan foto berhasil disimpan.");
        setActiveNotePhoto(null);
      } else {
        const err = await res.json();
        showToast(err.error || "Gagal menyimpan catatan.");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.");
    } finally {
      setIsSavingNote(false);
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
        confetti({
          particleCount: 120,
          spread: 80,
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

  // WhatsApp Message Generator (With Notes & Extra Quota)
  const getWhatsAppShareLink = () => {
    if (!studio || !gallery) return "#";
    const waNumber = studio.whatsapp.replace(/[^0-9]/g, "");

    const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));

    const selectedList = selectedPhotos
      .map((p, idx) => {
        const note = photoNotes[p.id] || p.notes || "";
        return `${idx + 1}. ${p.file_name}${note ? `\n   ↳ Catatan: "${note}"` : ""}`;
      })
      .join("\n");

    let extraCostBreakdown = "";
    if (extraCount > 0 && extraPrice > 0) {
      extraCostBreakdown = `\n\n*Rincian Tagihan Ekstra Foto:*
• Kuota Paket: ${maxQuota} Foto
• Foto Tambahan: ${extraCount} Foto x Rp ${extraPrice.toLocaleString("id-ID")}
• *Total Biaya Ekstra:* Rp ${extraTotalCost.toLocaleString("id-ID")}`;
    }

    const text = `Halo *${studio.name}*, saya *${gallery.client_name}* telah selesai memilih *${currentCount} foto* untuk galeri *${gallery.title}* (Kode: ${gallery.gallery_code}).
${extraCostBreakdown}

Berikut daftar nama file foto pilihan kami:
${selectedList}

Terima kasih banyak!`;

    return `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(text)}`;
  };

  // Download All Selected Photos as ZIP
  const handleDownloadZip = async () => {
    if (selectedIds.size === 0) {
      showToast("Pilih minimal 1 foto untuk diunduh.");
      return;
    }

    setIsDownloadingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const selectedList = photos.filter((p) => selectedIds.has(p.id));
      const total = selectedList.length;

      for (let i = 0; i < total; i++) {
        const photo = selectedList[i];
        const imgUrl = getImageUrl(photo, 1200);

        try {
          const resp = await fetch(imgUrl);
          const blob = await resp.blob();
          zip.file(photo.file_name, blob);
        } catch (fetchErr) {
          console.warn(`Gagal mengambil ${photo.file_name}`, fetchErr);
        }

        setZipProgress(Math.round(((i + 1) / total) * 90));
      }

      setZipProgress(95);
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${gallery?.gallery_code || "PilahFoto"}-${gallery?.client_name || "Klien"}-Pilihan-Foto.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setZipProgress(100);
      showToast("Arsip ZIP berhasil diunduh ke perangkat Anda!");
    } catch (err) {
      showToast("Gagal membuat arsip ZIP foto.");
    } finally {
      setIsDownloadingZip(false);
      setZipProgress(0);
    }
  };

  // Story 9:16 Canvas Generator
  const handleOpenStoryMaker = () => {
    const selected = photos.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) {
      showToast("Pilih minimal 1 foto terlebih dahulu.");
      return;
    }
    setStoryPhotos(selected.slice(0, 3)); // Default 1-3 foto
    setShowStoryModal(true);
  };

  // Render Story to Canvas
  useEffect(() => {
    if (!showStoryModal || storyPhotos.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;

    // Draw background
    ctx.fillStyle = "#0c0d10";
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle luxury gradient
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, "rgba(201, 169, 110, 0.12)");
    grad.addColorStop(0.5, "rgba(12, 13, 16, 0.95)");
    grad.addColorStop(1, "rgba(201, 169, 110, 0.08)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Frame border
    ctx.strokeStyle = "rgba(201, 169, 110, 0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1000, 1840);

    // Header branding
    ctx.fillStyle = "#c9a96e";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "6px";
    ctx.fillText("M E M O R I E S", 540, 150);

    ctx.fillStyle = "#ffffff";
    ctx.font = "italic 48px Georgia, serif";
    ctx.fillText(gallery?.title || "Special Gallery", 540, 220);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "24px sans-serif";
    ctx.fillText(`Dedicated to ${gallery?.client_name || "Beloved Client"}`, 540, 270);

    // Load and draw photo(s)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = getImageUrl(storyPhotos[0], 1200);

    img.onload = () => {
      // Photo frame (Aspect 4:5 centered)
      const photoX = 90;
      const photoY = 350;
      const photoW = 900;
      const photoH = 1125;

      // Draw photo container shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.fillStyle = "#16171d";
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.restore();

      // Draw image cover-fit
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, photoW, photoH);
      ctx.clip();

      const imgAspect = img.width / img.height;
      const frameAspect = photoW / photoH;
      let drawW, drawH, drawX, drawY;

      if (imgAspect > frameAspect) {
        drawH = photoH;
        drawW = photoH * imgAspect;
        drawX = photoX - (drawW - photoW) / 2;
        drawY = photoY;
      } else {
        drawW = photoW;
        drawH = photoW / imgAspect;
        drawX = photoX;
        drawY = photoY - (drawH - photoH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Photo frame border
      ctx.strokeStyle = "#c9a96e";
      ctx.lineWidth = 3;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Footer branding
      ctx.fillStyle = "#c9a96e";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(studio?.name?.toUpperCase() || "LIMZ PHOTOGRAPHY", 540, 1600);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "20px sans-serif";
      ctx.fillText("Captured with Passion & Pure Art", 540, 1650);

      ctx.fillStyle = "rgba(201, 169, 110, 0.7)";
      ctx.font = "18px monospace";
      ctx.fillText(`CODE: ${gallery?.gallery_code || "GAL-001"}`, 540, 1720);
    };
  }, [showStoryModal, storyPhotos, gallery, studio]);

  const handleDownloadStoryImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/jpeg", 0.95);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gallery?.client_name || "Story"}-Story-LimzPhotography.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Story 9:16 berhasil disimpan!");
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

  // Lightbox Slider Index in Preview
  const previewIndex = useMemo(() => {
    if (!previewPhoto) return -1;
    return filteredPhotos.findIndex((p) => p.id === previewPhoto.id);
  }, [previewPhoto, filteredPhotos]);

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewIndex > 0) {
      setPreviewPhoto(filteredPhotos[previewIndex - 1]);
    } else if (filteredPhotos.length > 0) {
      setPreviewPhoto(filteredPhotos[filteredPhotos.length - 1]);
    }
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewIndex >= 0 && previewIndex < filteredPhotos.length - 1) {
      setPreviewPhoto(filteredPhotos[previewIndex + 1]);
    } else if (filteredPhotos.length > 0) {
      setPreviewPhoto(filteredPhotos[0]);
    }
  };

  // Keyboard navigation for Fullscreen Preview Modal
  useEffect(() => {
    if (!previewPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "Escape") setPreviewPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPhoto, previewIndex, filteredPhotos]);

  // Touch Swipe for Fullscreen Preview Modal
  const previewTouchStartX = useRef<number | null>(null);

  const handlePreviewTouchStart = (e: React.TouchEvent) => {
    previewTouchStartX.current = e.touches[0].clientX;
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent) => {
    if (previewTouchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - previewTouchStartX.current;
    if (deltaX > 50) {
      handlePrevPhoto();
    } else if (deltaX < -50) {
      handleNextPhoto();
    }
    previewTouchStartX.current = null;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-medium">Membuka Galeri Kenangan...</h2>
        <p className="text-xs text-obsidian-muted mt-1">Mengambil foto langsung dari Google Drive</p>
      </div>
    );
  }

  // Gallery Not Found
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

  // PIN PROTECTION SCREEN (IF CONFIGURED & NOT UNLOCKED)
  if (gallery.pin_code && !isPinUnlocked) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-obsidian-surface border border-obsidian-line rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4 border border-gold/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-[11px] font-bold text-gold uppercase tracking-widest block mb-1">
            {studio?.name || "Limz Photography"}
          </span>
          <h2 className="font-serif text-2xl font-semibold text-obsidian-text mb-2">
            Galeri Dilindungi PIN
          </h2>
          <p className="text-xs text-obsidian-muted mb-6 leading-relaxed">
            Galeri <b>{gallery.title}</b> bersifat privat. Silakan masukkan PIN 4–6 digit yang diberikan oleh pihak studio foto.
          </p>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN"
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-xl bg-obsidian-surface2 border border-obsidian-line focus:outline-none focus:border-gold text-gold"
              />
              {pinError && <p className="text-xs text-red-400 mt-2 font-medium">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full btn-gold py-3 rounded-xl text-xs font-bold shadow-lg"
            >
              Buka Galeri Foto →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text pb-32 selection:bg-gold selection:text-obsidian-bg">
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

          {/* REAL-TIME PILL COUNTER & EXTRA BADGE */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-obsidian-surface2 border border-obsidian-line rounded-full px-3.5 py-1.5 shadow-md">
              <div className="text-center">
                <span className="font-serif text-lg sm:text-xl font-bold text-gold tabular-nums leading-none">
                  {currentCount}
                </span>
                <span className="text-xs text-obsidian-muted font-normal"> / {maxQuota}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            </div>

            {extraCount > 0 && extraPrice > 0 && (
              <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                +{extraCount} Ekstra (+Rp {extraTotalCost.toLocaleString("id-ID")})
              </span>
            )}
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="max-w-6xl mx-auto mt-2 h-1 bg-obsidian-line rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              currentCount > maxQuota
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-gold-dim to-gold"
            }`}
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

      {/* TOOLBAR, FILTER TABS & PILIHIN PRO ACTIONS */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-obsidian-line/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-gold text-obsidian-bg font-bold shadow-md"
                : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
            }`}
          >
            Semua Foto ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab("selected")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "selected"
                ? "bg-gold text-obsidian-bg font-bold shadow-md"
                : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
            }`}
          >
            Foto Terpilih ({currentCount})
          </button>
          <Link
            href={`/memories/${code}`}
            target="_blank"
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gold/40 bg-gold/15 text-gold hover:bg-gold hover:text-obsidian-bg transition-all flex items-center gap-1.5 shadow-md"
            title="Buka Mode Kenangan Fullscreen untuk Tamu & Keluarga"
          >
            <span>✨</span>
            <span className="font-bold">Mode Kenangan</span>
            <span className="text-[10px] opacity-75">↗</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 sm:w-44">
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
            <span>⇆</span>
            <span>{isSwipeMode ? "Kembali ke Grid" : "Mode Geser"}</span>
          </button>

          {/* STORY MAKER BUTTON */}
          <button
            onClick={handleOpenStoryMaker}
            disabled={currentCount === 0}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-gold/40 bg-gold/10 text-gold hover:bg-gold hover:text-obsidian-bg transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-30"
            title="Buat Story 9:16 dari foto terpilih"
          >
            <span>🎨</span>
            <span className="hidden sm:inline">Bikin</span> Story 9:16
          </button>

          {/* DOWNLOAD ZIP BUTTON */}
          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip || currentCount === 0}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-obsidian-line bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text hover:border-gold transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-30"
            title="Download seluruh foto terpilih dalam 1 arsip ZIP"
          >
            <span>📦</span>
            <span>{isDownloadingZip ? `${zipProgress}%` : "Unduh ZIP"}</span>
          </button>
        </div>
      </div>

      {/* GALLERY CONTENT */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        {activeTab === "magazine" ? (
          /* ============================================================== */
          /* MODE ALBUM KENANGAN (DIGITAL MAGAZINE SPREADS ALA PILIHIN)     */
          /* ============================================================== */
          <div className="py-6 max-w-4xl mx-auto">
            <div className="text-center mb-8 border-b border-obsidian-line/60 pb-6">
              <span className="text-xs uppercase tracking-widest text-gold font-bold">
                Album Kenangan Digital
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-obsidian-text mt-1">
                {gallery.title}
              </h2>
              <p className="text-xs text-obsidian-muted mt-2">
                Koleksi momen terbaik pilihan {gallery.client_name} • Dihadirkan oleh {studio?.name || "Limz Photography"}
              </p>
            </div>

            {selectedIds.size === 0 ? (
              <div className="text-center py-16 text-obsidian-muted">
                <p className="font-serif text-xl">Belum ada foto yang dipilih.</p>
                <p className="text-xs mt-1">Pilih beberapa foto di tab Semua Foto untuk melihat pratinjau album kenangan.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {photos
                  .filter((p) => selectedIds.has(p.id))
                  .map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="rounded-3xl overflow-hidden bg-obsidian-surface border border-obsidian-line/70 shadow-2xl p-4 sm:p-6"
                    >
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          referrerPolicy="no-referrer"
                          src={getImageUrl(photo, 1600)}
                          alt={photo.file_name}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono text-obsidian-text">
                          Page #{idx + 1} • {photo.file_name}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-obsidian-line/40">
                        <div>
                          <p className="text-xs font-serif italic text-gold">
                            Momen Terpilih #{idx + 1}
                          </p>
                          {photoNotes[photo.id] && (
                            <p className="text-xs text-emerald-300 mt-1 font-medium bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                              💬 Catatan Retouch: &quot;{photoNotes[photo.id]}&quot;
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenNoteModal(photo)}
                          className="text-xs text-obsidian-muted hover:text-gold flex items-center gap-1 self-start sm:self-auto"
                        >
                          ✏️ {photoNotes[photo.id] ? "Ubah Catatan" : "Tambah Catatan"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="p-16 text-center text-obsidian-muted">
            <p className="font-serif text-xl">Tidak ada foto yang cocok.</p>
            {activeTab === "selected" && (
              <p className="text-xs mt-1">Anda belum memilih foto apapun. Silakan kembali ke tab Semua Foto.</p>
            )}
          </div>
        ) : isSwipeMode ? (
          /* ============================================================== */
          /* MODE GESER (SWIPE MODE ALA TINDER)                             */
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
                  referrerPolicy="no-referrer"
                  src={getImageUrl(filteredPhotos[swipeIndex], 1200)}
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

                {/* NOTE BADGE ON SWIPE */}
                {photoNotes[filteredPhotos[swipeIndex].id] && (
                  <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-gold/40 text-xs text-gold flex items-center justify-between">
                    <span className="truncate">💬 &quot;{photoNotes[filteredPhotos[swipeIndex].id]}&quot;</span>
                    <button
                      onClick={() => handleOpenNoteModal(filteredPhotos[swipeIndex])}
                      className="underline text-[10px] ml-2 shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SWIPE ACTION BUTTONS */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
              <button
                onClick={() => {
                  if (swipeIndex > 0) setSwipeIndex(swipeIndex - 1);
                }}
                disabled={swipeIndex === 0}
                className="px-3.5 py-3 rounded-full bg-obsidian-surface border border-obsidian-line text-obsidian-muted disabled:opacity-20 flex items-center gap-1 text-xs"
                title="Foto Sebelumnya"
              >
                ◀
              </button>

              <button
                onClick={() => {
                  if (swipeIndex < filteredPhotos.length - 1) {
                    setSwipeIndex(swipeIndex + 1);
                  } else {
                    showToast("Sudah di foto terakhir!");
                  }
                }}
                className="px-4 py-3 rounded-full bg-obsidian-surface border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-1.5 text-xs font-bold shadow-xl transition-all"
                title="Lewati"
              >
                <span>✕</span>
                <span>Lewati</span>
              </button>

              <button
                onClick={() => {
                  const currentPhoto = filteredPhotos[swipeIndex];
                  if (currentPhoto) {
                    handleToggleSelect(currentPhoto);
                    if (!selectedIds.has(currentPhoto.id) && swipeIndex < filteredPhotos.length - 1) {
                      setTimeout(() => setSwipeIndex(swipeIndex + 1), 250);
                    }
                  }
                }}
                className={`px-5 py-3 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-xl transition-all ${
                  filteredPhotos[swipeIndex] && selectedIds.has(filteredPhotos[swipeIndex].id)
                    ? "bg-red-500 text-white hover:bg-red-600 scale-105"
                    : "bg-gold text-obsidian-bg hover:brightness-110 active:scale-95"
                }`}
              >
                {filteredPhotos[swipeIndex] && selectedIds.has(filteredPhotos[swipeIndex].id) ? (
                  <>
                    <span>✕</span>
                    <span>Batal Pilih</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Pilih Foto</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (filteredPhotos[swipeIndex]) handleOpenNoteModal(filteredPhotos[swipeIndex]);
                }}
                className="px-3.5 py-3 rounded-full bg-obsidian-surface border border-gold/40 text-gold hover:bg-gold hover:text-obsidian-bg text-xs font-bold transition-all"
                title="Tulis Catatan Retouch"
              >
                ✏️
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MODE JUSTIFIED GRID PROPORSIONAL (DENGAN CATATAN & TOMBOL JELAS)*/
          /* ============================================================== */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              const note = photoNotes[photo.id];

              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-xl overflow-hidden bg-obsidian-surface border transition-all duration-200 cursor-pointer flex flex-col ${
                    isSelected
                      ? "border-gold ring-2 ring-gold/40 shadow-xl"
                      : "border-obsidian-line/80 hover:border-gold/40"
                  }`}
                  onClick={() => setPreviewPhoto(photo)}
                >
                  {/* Photo Thumbnail */}
                  <div className="aspect-[4/3] w-full overflow-hidden bg-obsidian-surface2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      referrerPolicy="no-referrer"
                      src={getImageUrl(photo, 600)}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* SELECT BADGE BUTTON AT TOP RIGHT */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(photo);
                      }}
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95 shadow-xl text-[11px] font-bold ${
                        isSelected
                          ? "bg-gold text-obsidian-bg ring-2 ring-gold/60 shadow-gold/30 scale-105"
                          : "bg-black/75 backdrop-blur-md text-white/95 hover:bg-black/90 hover:text-gold border border-white/30"
                      }`}
                      aria-label={isSelected ? "Batal pilih foto" : "Pilih foto"}
                    >
                      {isSelected ? "✓ Terpilih" : "+ Pilih"}
                    </button>

                    {/* NOTE INDICATOR BADGE AT TOP LEFT */}
                    {note && (
                      <div
                        onClick={(e) => handleOpenNoteModal(photo, e)}
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-bold flex items-center gap-1 shadow-md hover:scale-105 transition-transform"
                        title={note}
                      >
                        💬 Catatan
                      </div>
                    )}
                  </div>

                  {/* Photo Metadata Bar */}
                  <div className="p-2 sm:p-2.5 bg-obsidian-surface flex items-center justify-between text-xs border-t border-obsidian-line/40 mt-auto">
                    <span className="font-mono text-[11px] sm:text-xs text-obsidian-muted truncate max-w-[90px] sm:max-w-[120px]" title={photo.file_name}>
                      {photo.file_name}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenNoteModal(photo, e)}
                        className={`p-1 rounded text-[11px] transition-colors ${
                          note
                            ? "text-gold bg-gold/15"
                            : "text-obsidian-muted hover:text-gold hover:bg-obsidian-surface2"
                        }`}
                        title={note ? `Catatan: "${note}"` : "Tambah catatan retouch"}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(photo);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          isSelected
                            ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30"
                            : "bg-gold/15 text-gold hover:bg-gold/25 border border-gold/30"
                        }`}
                      >
                        {isSelected ? "Batal" : "Pilih"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FULLSCREEN PREVIEW SLIDER MODAL */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-obsidian-muted pb-2">
            <span className="font-mono text-obsidian-text">
              Foto {previewIndex + 1} dari {filteredPhotos.length} • {previewPhoto.file_name}
            </span>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="text-white hover:text-gold text-sm px-3.5 py-1.5 rounded-full bg-white/10 transition-colors"
            >
              ✕ Tutup
            </button>
          </div>

          {/* Center Image Container with Touch Swipe & Floating Nav Arrows */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden my-auto relative"
            onTouchStart={handlePreviewTouchStart}
            onTouchEnd={handlePreviewTouchEnd}
          >
            {/* Left Nav Arrow */}
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/65 hover:bg-gold text-white hover:text-obsidian-bg backdrop-blur-md flex items-center justify-center text-xl shadow-2xl transition-all border border-white/20 hover:border-gold active:scale-95"
              title="Foto Sebelumnya (Panah Kiri)"
            >
              ◀
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={getImageUrl(previewPhoto, 1600)}
              alt={previewPhoto.file_name}
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Right Nav Arrow */}
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/65 hover:bg-gold text-white hover:text-obsidian-bg backdrop-blur-md flex items-center justify-center text-xl shadow-2xl transition-all border border-white/20 hover:border-gold active:scale-95"
              title="Foto Berikutnya (Panah Kanan)"
            >
              ▶
            </button>
          </div>

          {/* ACTIVE NOTE DISPLAY IN FULLSCREEN */}
          {photoNotes[previewPhoto.id] && (
            <div
              className="max-w-xl mx-auto my-2 px-4 py-2 rounded-xl bg-obsidian-surface/90 border border-gold/40 text-xs text-gold text-center"
              onClick={(e) => e.stopPropagation()}
            >
              💬 Catatan Retouch: &quot;{photoNotes[previewPhoto.id]}&quot;
            </div>
          )}

          {/* BOTTOM ACTIONS IN FULLSCREEN (SLIDER CONTROLS & SELECTION) */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleOpenNoteModal(previewPhoto)}
              className="px-5 py-3 rounded-full text-xs font-bold transition-all shadow-xl flex items-center gap-1.5 bg-obsidian-surface border border-gold/50 text-gold hover:bg-gold hover:text-obsidian-bg"
            >
              <span>✏️</span>
              <span>{photoNotes[previewPhoto.id] ? "Ubah Catatan Edit" : "Tambah Catatan Edit"}</span>
            </button>

            {selectedIds.has(previewPhoto.id) ? (
              <button
                onClick={() => handleToggleSelect(previewPhoto)}
                className="px-7 py-3 rounded-full text-xs font-bold transition-all shadow-2xl flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/50"
              >
                <span>✕</span>
                <span>Batal Pilih Foto Ini</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleSelect(previewPhoto)}
                className="px-7 py-3 rounded-full text-xs font-bold transition-all shadow-2xl flex items-center gap-2 bg-gold text-obsidian-bg hover:brightness-110 active:scale-95"
              >
                <span className="text-sm font-bold">+</span>
                <span>Pilih Foto Ini</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* NOTE EDITOR MODAL */}
      {activeNotePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveNotePhoto(null)}
        >
          <div
            className="bg-obsidian-surface border border-obsidian-line rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-obsidian-line">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold">Instruksi Retouch Klien</span>
                <h3 className="font-serif text-lg font-semibold text-obsidian-text">
                  Catatan untuk {activeNotePhoto.file_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveNotePhoto(null)}
                className="text-obsidian-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-obsidian-muted mt-3 mb-2 leading-relaxed">
              Tuliskan permintaan khusus (misal: hilangkan jerawat, perbaiki pencahayaan, crop lebih dekat, dll.). Catatan ini akan dikirim langsung ke fotografer.
            </p>

            <textarea
              rows={4}
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="Contoh: Tolong hilangkan orang baju merah di latar belakang, kulit di-smooth sedikit kak..."
              className="w-full bg-obsidian-surface2 border border-obsidian-line rounded-xl p-3 text-xs text-obsidian-text focus:outline-none focus:border-gold transition-colors"
            />

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-obsidian-line">
              <button
                type="button"
                onClick={() => setActiveNotePhoto(null)}
                className="px-4 py-2 rounded-full text-xs text-obsidian-muted hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="btn-gold px-5 py-2 rounded-full text-xs font-bold"
              >
                {isSavingNote ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STORY 9:16 CANVAS MODAL */}
      {showStoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowStoryModal(false)}
        >
          <div
            className="bg-obsidian-surface border border-obsidian-line rounded-3xl max-w-lg w-full p-6 shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-obsidian-line mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold">Canvas Studio</span>
                <h3 className="font-serif text-xl font-medium text-obsidian-text">
                  Bikin Story IG & WA Status (9:16)
                </h3>
              </div>
              <button
                onClick={() => setShowStoryModal(false)}
                className="text-obsidian-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <canvas
                ref={canvasRef}
                className="w-48 sm:w-56 rounded-2xl shadow-2xl border border-obsidian-line aspect-[9/16]"
              />
            </div>

            <p className="text-xs text-center text-obsidian-muted mb-4">
              Layout otomatis dibuat dalam rasio 9:16 (1080x1920) siap posting ke Instagram Story atau WhatsApp Status.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowStoryModal(false)}
                className="px-4 py-2.5 rounded-full text-xs text-obsidian-muted hover:text-white"
              >
                Tutup
              </button>
              <button
                onClick={handleDownloadStoryImage}
                className="btn-gold px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2"
              >
                <span>💾</span>
                <span>Unduh Gambar Story (.JPG)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM ACTION BAR (WITH REAL-TIME EXTRA CALCULATION) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-obsidian-surface/95 backdrop-blur-xl border-t border-obsidian-line px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-obsidian-text flex items-center gap-1.5">
              <span className="text-gold font-bold text-sm sm:text-base">{currentCount}</span> / {maxQuota} Foto Terpilih
              {extraCount > 0 && extraPrice > 0 && (
                <span className="text-amber-400 font-bold text-xs">
                  (+{extraCount} Ekstra: Rp {extraTotalCost.toLocaleString("id-ID")})
                </span>
              )}
            </div>
            <div className="text-[11px] text-obsidian-faint">
              {currentCount > maxQuota
                ? `Melebihi paket ${extraCount} foto (+Rp ${extraTotalCost.toLocaleString("id-ID")})`
                : currentCount === maxQuota
                ? "Kuota paket pas terpenuhi"
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
              Anda telah memilih <b className="text-gold">{currentCount} foto</b> dari kuota paket {maxQuota}.
              {extraCount > 0 && extraPrice > 0 && (
                <span className="block mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  ⚠️ <b>Catatan Foto Tambahan:</b> Anda memilih {extraCount} foto di luar kuota paket dengan estimasi biaya tambahan <b>Rp {extraTotalCost.toLocaleString("id-ID")}</b>.
                </span>
              )}
              <span className="block mt-2">
                Setelah Anda mengonfirmasi, galeri akan <b>dikunci permanen</b> untuk menghindari perubahan, dan kami akan mengarahkan Anda ke WhatsApp {studio?.name || "Limz Photography"}.
              </span>
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
