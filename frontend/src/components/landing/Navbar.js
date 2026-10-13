"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/common/Logo";
import { ChevronDownIcon } from "@/components/icons";
import useSessionHint from "@/hooks/useSessionHint";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLoggedIn = useSessionHint();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-canvas/95 backdrop-blur-md border-b border-line py-3.5"
          : "bg-transparent py-4 md:py-6"
      }`}
    >
      <div className="container-page flex items-center justify-between">
        
        {/* Brand Wordmark (Exact klozer • logo with Brand Icon) */}
        <Logo size="md" variant="dark" withIcon={true} />

        {/* Center Nav Links with dropdown arrows */}
        <nav className="hidden lg:flex items-center gap-8">
          <a
            href="#fitur"
            className="text-body font-medium text-charcoal hover:text-brand flex items-center gap-1 transition-colors no-underline"
          >
            <span>Fitur Produk</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-fg-subtle" />
          </a>
          <a
            href="#cara-kerja"
            className="text-body font-medium text-charcoal hover:text-brand transition-colors no-underline"
          >
            Cara Kerja
          </a>
          <a
            href="#harga"
            className="text-body font-medium text-charcoal hover:text-brand transition-colors no-underline"
          >
            Paket Harga
          </a>
          <a
            href="#testimoni"
            className="text-body font-medium text-charcoal hover:text-brand flex items-center gap-1 transition-colors no-underline"
          >
            <span>Kisah Sukses</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-fg-subtle" />
          </a>
        </nav>

        {/* Right CTA Group - Masuk / Dashboard & Coba Gratis Berdampingan */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="btn-primary text-body-sm !py-2.5 !px-5 font-bold shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <span>Dashboard</span>
              <span>→</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2.5 rounded-full text-body-sm font-bold text-charcoal hover:text-brand hover:bg-white/60 transition-all no-underline"
              >
                Masuk
              </Link>
              <a
                href="#demo"
                className="btn-outline text-body-sm !py-2.5 !px-4.5 font-semibold"
              >
                Tanya AI
              </a>
              <Link
                href="/register"
                className="btn-primary text-body-sm !py-2.5 !px-5 font-bold shadow-sm hover:shadow-md"
              >
                Coba Gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl bg-white border border-line cursor-pointer"
          aria-label="Toggle navigation"
        >
          <svg className="text-charcoal" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-canvas border-b border-line px-6 py-6 flex flex-col gap-3 shadow-lg">
          <a
            href="#fitur"
            onClick={() => setMobileOpen(false)}
            className="text-body font-medium text-charcoal py-2 border-b border-line no-underline"
          >
            Fitur Produk
          </a>
          <a
            href="#cara-kerja"
            onClick={() => setMobileOpen(false)}
            className="text-body font-medium text-charcoal py-2 border-b border-line no-underline"
          >
            Cara Kerja
          </a>
          <a
            href="#harga"
            onClick={() => setMobileOpen(false)}
            className="text-body font-medium text-charcoal py-2 border-b border-line no-underline"
          >
            Paket Harga
          </a>
          <a
            href="#testimoni"
            onClick={() => setMobileOpen(false)}
            className="text-body font-medium text-charcoal py-2 no-underline"
          >
            Kisah Sukses Pelanggan
          </a>
          <div className="flex flex-col gap-2 pt-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full text-center text-body-sm font-bold"
              >
                Buka Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-outline w-full text-center text-body-sm font-bold"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full text-center text-body-sm font-bold"
                >
                  Coba Gratis Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
