"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, signInWithGoogle, signInAsStudio, signOut } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setLoadingGoogle(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoadingDemo(true);
    await signInAsStudio("wccin.bylimz@gmail.com", "Limz Photography");
  };

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text flex flex-col justify-between selection:bg-gold selection:text-obsidian-bg">
      {/* HEADER */}
      <header className="px-6 py-6 flex items-center justify-between border-b border-obsidian-line/40">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl font-semibold tracking-wide text-obsidian-text group-hover:text-gold transition-colors">
            PilahFoto
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-sans uppercase tracking-widest font-bold">
            by Limz
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs sm:text-sm text-obsidian-muted hover:text-gold transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
      </header>

      {/* LOGIN CARD */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gold/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-obsidian-surface border border-obsidian-line/80 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 backdrop-blur-md">
          {user ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold text-gold font-serif text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {user.name.charAt(0)}
              </div>
              <h2 className="font-serif text-2xl font-medium mb-1">
                Halo, {user.name}
              </h2>
              <p className="text-xs text-obsidian-muted mb-6">
                Anda sudah masuk sebagai <span className="text-gold">{user.email}</span>
              </p>

              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="btn-gold w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  Buka Dashboard Studio →
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full py-2.5 rounded-xl border border-obsidian-line text-xs text-obsidian-muted hover:text-red-400 hover:border-red-900/50 transition-colors"
                >
                  Keluar / Ganti Akun
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs uppercase tracking-widest font-bold mb-4">
                  <span>Fotografer & Studio</span>
                </div>
                <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">
                  Masuk ke PilahFoto
                </h1>
                <p className="text-xs sm:text-sm text-obsidian-muted leading-relaxed">
                  Kelola galeri seleksi klien dari Google Drive, pantau pilihan secara real-time, dan ekspor ke Lightroom.
                </p>
              </div>

              {/* GOOGLE SIGN IN BUTTON */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loadingGoogle || loadingDemo}
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all duration-200 text-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {loadingGoogle ? "Menghubungkan ke Google..." : "Lanjutkan dengan Akun Google"}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-obsidian-line"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-obsidian-surface px-2 text-obsidian-faint">
                      atau akses studio
                    </span>
                  </div>
                </div>

                {/* QUICK STUDIO DEMO LOGIN */}
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loadingGoogle || loadingDemo}
                  className="w-full bg-obsidian-surface2 hover:bg-obsidian-surface2/80 border border-obsidian-line hover:border-gold/50 text-obsidian-text py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  {loadingDemo ? "Membuka sesi..." : "Masuk Cepat sebagai Limz Photography"}
                </button>
              </div>

              {/* SECURITY & TRUST BADGES */}
              <div className="mt-8 pt-6 border-t border-obsidian-line/60 space-y-2 text-xs text-obsidian-faint">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Zero Server Upload: Foto tetap tersimpan di Google Drive Anda.</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Tanpa password rumit, aman dengan otentikasi resmi Google.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-4 text-center text-xs text-obsidian-faint border-t border-obsidian-line/40">
        © 2026 PilahFoto by Limz Photography. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}

