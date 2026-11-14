import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-serif text-2xl font-semibold tracking-wide text-obsidian-text group-hover:text-gold transition-colors">
            PilahFoto
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-sans uppercase tracking-widest font-bold">
            by Limz
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/#demo"
            className="text-xs sm:text-sm font-medium text-obsidian-muted hover:text-gold transition-colors"
          >
            Coba Demo
          </Link>
          <Link
            href="/dashboard"
            className="text-xs sm:text-sm px-4 py-2 rounded-full border border-obsidian-line bg-obsidian-surface hover:border-gold hover:text-gold transition-all"
          >
            Dashboard Studio
          </Link>
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

