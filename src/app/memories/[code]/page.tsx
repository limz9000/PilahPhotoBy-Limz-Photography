"use client";

import { use, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Gallery, Photo, Studio } from "@/lib/types";

interface MemoriesPageProps {
  params: Promise<{ code: string }>;
}

export default function MemoriesAlbumPage({ params }: MemoriesPageProps) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // UI States
  const [activeFilter, setActiveFilter] = useState<"all" | "highlight">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);

  // Fullscreen Lightbox Slider
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const touchStartX = useRef<number | null>(null);

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
        }
      } catch (err) {
        console.error("Gagal memuat album kenangan:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [code]);

  // Robust Image Proxy URL
  const getImageUrl = (photo: Photo, width = 1200) => {
    if (photo.drive_file_id && !photo.drive_file_id.startsWith("demo-")) {
      return `/api/image-proxy?id=${photo.drive_file_id}&w=${width}`;
    }
    return photo.thumbnail_url;
  };

  // Hero Cover Photo (Pick first photo or selected highlight)
  const heroPhoto = useMemo(() => {
    if (photos.length === 0) return null;
    return photos[0];
  }, [photos]);

  // Filtered Photos List
  const displayedPhotos = useMemo(() => {
    return photos.filter((p, idx) => {
      const matchSearch = p.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeFilter === "highlight") {
        // Highlight first 12 photos or selected ones
        return matchSearch && (p.is_selected || idx < 12);
      }
      return matchSearch;
    });
  }, [photos, activeFilter, searchQuery]);

  // Lightbox Slider Index
  const lightboxIndex = useMemo(() => {
    if (!lightboxPhoto) return -1;
    return displayedPhotos.findIndex((p) => p.id === lightboxPhoto.id);
  }, [lightboxPhoto, displayedPhotos]);

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex > 0) {
      setLightboxPhoto(displayedPhotos[lightboxIndex - 1]);
    } else if (displayedPhotos.length > 0) {
      setLightboxPhoto(displayedPhotos[displayedPhotos.length - 1]);
    }
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex >= 0 && lightboxIndex < displayedPhotos.length - 1) {
      setLightboxPhoto(displayedPhotos[lightboxIndex + 1]);
    } else if (displayedPhotos.length > 0) {
      setLightboxPhoto(displayedPhotos[0]);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "Escape") setLightboxPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto, lightboxIndex, displayedPhotos]);

  // Touch Swipe for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 50) {
      handlePrevPhoto();
    } else if (deltaX < -50) {
      handleNextPhoto();
    }
    touchStartX.current = null;
  };

  const scrollToAlbum = () => {
    const el = document.getElementById("album-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col items-center justify-center p-6 text-center">
        <span className="font-serif text-xs text-gold uppercase tracking-widest mb-2">
          Album by {studio?.name || "Limz Photography"}
        </span>
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin my-4" />
        <p className="text-xs text-obsidian-muted">Memuat foto kenangan dari Google Drive...</p>
      </div>
    );
  }

  // Gallery Not Found
  if (!gallery) {
    return (
      <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-serif text-3xl font-medium text-red-400">Album Kenangan Tidak Ditemukan</h2>
        <p className="text-xs text-obsidian-muted mt-2">
          Pastikan tautan atau kode galeri yang Anda buka sudah benar.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text selection:bg-gold selection:text-obsidian-bg">
      {/* ============================================================== */}
      {/* 1. FULLSCREEN HERO COVER BANNER (100vh ALA PILIHIN DEMO-MEMORIES)*/}
      {/* ============================================================== */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col justify-between items-center text-center p-6">
        {/* Hero Background Image with Dark Vignette */}
        {heroPhoto && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={getImageUrl(heroPhoto, 1920)}
              alt={gallery.title}
              className="w-full h-full object-cover scale-105 animate-fade-in"
            />
            {/* Multi-tier gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-bg via-black/40 to-black/70" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/30 to-black/80" />
          </div>
        )}

        {/* Top Floating Branding */}
        <div className="relative z-10 pt-6">
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-gold/90 border-b border-gold/40 pb-1">
            {studio?.name || "LIMZ PHOTOGRAPHY"}
          </span>
        </div>

        {/* Center/Bottom Romantic Typography */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 my-auto">
          <p className="text-xs uppercase tracking-[0.4em] text-gold/90 mb-3 font-semibold">
            {gallery.title}
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-light text-white tracking-wide leading-tight">
            {gallery.client_name}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 uppercase tracking-[0.3em] mt-3 font-light">
            YOUR STORY IN FRAMES
          </p>
        </div>

        {/* Bottom Scroll Indicator Button */}
        <div className="relative z-10 pb-8 flex flex-col items-center">
          <button
            onClick={scrollToAlbum}
            className="group flex flex-col items-center gap-2 text-xs font-medium text-white/80 hover:text-gold transition-colors cursor-pointer"
          >
            <span className="uppercase tracking-[0.25em] text-[11px]">ALBUM SELENGKAPNYA</span>
            <div className="w-8 h-8 rounded-full border border-white/30 group-hover:border-gold flex items-center justify-center transition-all animate-bounce">
              <span className="text-xs">⌄</span>
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. ALBUM EDITORIAL SECTION                                    */}
      {/* ============================================================== */}
      <section id="album-section" className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-serif text-3xl sm:text-5xl font-light text-obsidian-text">
            {gallery.client_name}
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mt-2 font-semibold">
            {gallery.title} • {photos.length} FOTO DOKUMENTASI
          </p>
          <p className="text-xs text-obsidian-muted mt-3 leading-relaxed">
            Abadikan kembali setiap senyum, tawa, dan kehangatan dalam lembaran album kenangan digital ini.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/g/${code}`}
              className="text-xs px-4 py-2 rounded-full border border-gold/50 bg-gold/10 text-gold hover:bg-gold hover:text-obsidian-bg font-semibold transition-all"
            >
              Mode Pilih Foto (Klien) →
            </Link>
          </div>
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-4 z-30 mb-8 p-3 rounded-2xl glass-header max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeFilter === "all"
                  ? "bg-gold text-obsidian-bg font-bold shadow-md"
                  : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
              }`}
            >
              Semua Foto ({photos.length})
            </button>
            <button
              onClick={() => setActiveFilter("highlight")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === "highlight"
                  ? "bg-gold text-obsidian-bg font-bold shadow-md"
                  : "bg-obsidian-surface text-obsidian-muted hover:text-obsidian-text border border-obsidian-line"
              }`}
            >
              <span>✨</span>
              <span>Highlight</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mode Geser / Swipe */}
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
              <span>{isSwipeMode ? "Mode Grid" : "Mode Geser"}</span>
            </button>

            {/* Search Box */}
            <div className="relative w-36 sm:w-44">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari file..."
                className="w-full bg-obsidian-surface border border-obsidian-line rounded-full pl-7 pr-3 py-1.5 text-xs text-obsidian-text placeholder:text-obsidian-faint focus:outline-none focus:border-gold"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-obsidian-muted text-xs">
                🔍
              </span>
            </div>
          </div>
        </div>

        {/* Album Content: Swipe Mode or Justified Grid */}
        {displayedPhotos.length === 0 ? (
          <div className="py-16 text-center text-obsidian-muted">
            <p className="font-serif text-xl">Tidak ada foto yang cocok.</p>
          </div>
        ) : isSwipeMode ? (
          /* ============================================================== */
          /* SWIPE MODE FOR MEMORIES                                        */
          /* ============================================================== */
          <div className="max-w-md mx-auto my-8 px-4">
            <div className="text-center text-xs text-obsidian-muted mb-3 flex items-center justify-between">
              <span>Mode Swipe Layar Sentuh</span>
              <span className="font-mono text-gold">
                {swipeIndex + 1} dari {displayedPhotos.length}
              </span>
            </div>

            {displayedPhotos[swipeIndex] && (
              <div
                className="relative rounded-3xl overflow-hidden bg-obsidian-surface border border-obsidian-line shadow-2xl aspect-[3/4] flex flex-col cursor-pointer"
                onClick={() => setLightboxPhoto(displayedPhotos[swipeIndex])}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  referrerPolicy="no-referrer"
                  src={getImageUrl(displayedPhotos[swipeIndex], 1200)}
                  alt={displayedPhotos[swipeIndex].file_name}
                  className="w-full h-full object-contain bg-black"
                />

                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-mono text-obsidian-text">
                  {displayedPhotos[swipeIndex].file_name}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => {
                  if (swipeIndex > 0) setSwipeIndex(swipeIndex - 1);
                }}
                disabled={swipeIndex === 0}
                className="px-5 py-3 rounded-full bg-obsidian-surface border border-obsidian-line text-obsidian-muted disabled:opacity-20 text-xs font-medium"
              >
                ◀ Sebelumnya
              </button>
              <button
                onClick={() => {
                  if (swipeIndex < displayedPhotos.length - 1) setSwipeIndex(swipeIndex + 1);
                }}
                disabled={swipeIndex >= displayedPhotos.length - 1}
                className="px-6 py-3 rounded-full btn-gold text-xs font-bold"
              >
                Berikutnya ▶
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* JUSTIFIED EDITORIAL GRID                                       */
          /* ============================================================== */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {displayedPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className="group relative rounded-2xl overflow-hidden bg-obsidian-surface border border-obsidian-line/80 hover:border-gold/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-obsidian-surface2 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    referrerPolicy="no-referrer"
                    src={getImageUrl(photo, 700)}
                    alt={photo.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20">
                      🔍 Lihat Penuh
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-obsidian-surface flex items-center justify-between text-xs border-t border-obsidian-line/40">
                  <span className="font-mono text-[11px] text-obsidian-muted truncate">
                    {photo.file_name}
                  </span>
                  <span className="text-[10px] text-obsidian-faint">#{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. FULLSCREEN LIGHTBOX SLIDER (WITH SLIDER BUTTONS & SWIPE)    */}
      {/* ============================================================== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-obsidian-muted pb-2">
            <span className="font-mono text-obsidian-text">
              Foto {lightboxIndex + 1} dari {displayedPhotos.length} • {lightboxPhoto.file_name}
            </span>
            <button
              onClick={() => setLightboxPhoto(null)}
              className="text-white hover:text-gold text-sm px-4 py-1.5 rounded-full bg-white/10 transition-colors"
            >
              ✕ Tutup
            </button>
          </div>

          {/* Center Image Container with Touch Swipe & Floating Nav Arrows */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden my-auto relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-gold text-white hover:text-obsidian-bg backdrop-blur-md flex items-center justify-center text-xl shadow-2xl transition-all border border-white/20 hover:border-gold active:scale-95"
              title="Foto Sebelumnya (Panah Kiri)"
            >
              ◀
            </button>

            {/* Main Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={getImageUrl(lightboxPhoto, 1600)}
              alt={lightboxPhoto.file_name}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-gold text-white hover:text-obsidian-bg backdrop-blur-md flex items-center justify-center text-xl shadow-2xl transition-all border border-white/20 hover:border-gold active:scale-95"
              title="Foto Berikutnya (Panah Kanan)"
            >
              ▶
            </button>
          </div>

          {/* Bottom Caption & Controls */}
          <div
            className="flex items-center justify-center gap-3 pt-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-obsidian-muted">
              Gunakan tombol panah ◀ / ▶ atau geser layar sentuh untuk melihat foto lain.
            </span>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="py-12 text-center text-xs text-obsidian-muted border-t border-obsidian-line/40 mt-16">
        <p className="font-serif text-lg text-gold">{studio?.name || "Limz Photography"}</p>
        <p className="text-[11px] text-obsidian-faint mt-1">
          Dihadirkan dengan penuh cinta dan keanggunan. Hak Cipta Terpelihara.
        </p>
      </footer>
    </div>
  );
}

