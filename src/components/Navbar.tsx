"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl font-semibold tracking-wide text-obsidian-text group-hover:text-gold transition-colors">
            PilahFoto
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-sans uppercase tracking-widest font-bold">
            by Limz
          </span>
        </Link>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/#demo"
            className="hidden sm:inline text-xs sm:text-sm font-medium text-obsidian-muted hover:text-gold transition-colors"
          >
            Coba Demo
          </Link>

          <Link
            href="/dashboard"
            className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full border border-obsidian-line bg-obsidian-surface hover:border-gold hover:text-gold transition-all"
          >
            Dashboard Studio
          </Link>

          {/* AUTH STATUS */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-obsidian-surface2 border border-obsidian-line hover:border-gold/50 transition-colors"
              >
                <span className="text-xs font-semibold text-obsidian-text max-w-[100px] truncate hidden md:inline">
                  {user.name.split(" ")[0]}
                </span>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-gold/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gold/20 text-gold font-bold text-xs flex items-center justify-center border border-gold/40">
                    {user.name.charAt(0)}
                  </div>
                )}
                <svg className="w-3.5 h-3.5 text-obsidian-muted mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-obsidian-surface border border-obsidian-line shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-obsidian-line/60">
                      <p className="text-xs font-bold text-obsidian-text truncate">{user.name}</p>
                      <p className="text-[10px] text-obsidian-muted truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-obsidian-text hover:bg-gold/15 hover:text-gold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard Galeri
                      </Link>
                      <Link
                        href="/dashboard/new"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-obsidian-text hover:bg-gold/15 hover:text-gold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Buat Galeri Baru
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-obsidian-line/60">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Keluar (Logout)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full bg-white text-gray-900 font-semibold hover:bg-gray-100 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
              <span>Masuk</span>
            </Link>
          )}

          <Link
            href="/dashboard/new"
            className="text-xs sm:text-sm px-4 py-2 rounded-full btn-gold font-semibold"
          >
            + Buat Galeri
          </Link>
        </div>
      </div>
    </nav>
  );
}
