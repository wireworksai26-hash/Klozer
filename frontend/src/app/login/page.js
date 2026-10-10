"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MailIcon,
  KeyIcon,
  SparklesIcon,
  AlertTriangleIcon,
  KlozerIcon,
} from "@/components/icons";
import { apiFetch, cacheUser } from "@/utils/api";

function LoginForm() {
  const router = useRouter();
  const sessionExpired = useSearchParams().get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Mohon masukkan email dan kata sandi.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { email, password }, auth: false });
      // The server set the httpOnly session cookie; keep only the profile for the first paint.
      cacheUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT COLUMN: Deep Ink Navy Atmospheric Side & Centered Brand Emblem */}
      <div className="relative hidden lg:flex flex-col justify-between items-center p-12 overflow-hidden bg-gradient-to-b from-ink via-[#08103d] to-[#040821]">
        {/* Ambient Cobalt Glows & Mist */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Mountain Silhouette Line Art in Deep Cobalt/Navy */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <svg className="w-full h-full object-cover" viewBox="0 0 1000 700" fill="none">
            <path
              d="M0,700 L250,420 L500,280 L750,450 L1000,700 Z"
              fill="url(#klozerMountainGrad)"
              opacity="0.5"
            />
            <path
              d="M500,280 L460,340 L500,320 L540,340 Z"
              fill="#ffffff"
              opacity="0.35"
            />
            <defs>
              <linearGradient id="klozerMountainGrad" x1="500" y1="280" x2="500" y2="700" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2545ff" />
                <stop offset="1" stopColor="#040821" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top Spacer */}
        <div className="w-full" />

        {/* Centered Brand Emblem Card with Official Klozer Icon (Clickable -> Landing Page) */}
        <Link
          href="/"
          className="relative z-10 bg-white rounded-[26px] py-7 px-10 shadow-[0_20px_60px_rgba(12,23,84,0.4)] border border-line flex items-center gap-4 animate-scale-pop hover:scale-105 hover:shadow-[0_25px_70px_rgba(12,23,84,0.5)] transition-all duration-300 no-underline cursor-pointer group"
          title="Kembali ke Beranda Klozer"
        >
          <KlozerIcon className="w-14 h-14 rounded-2xl shadow-md flex-shrink-0 group-hover:rotate-3 transition-transform" />
          <span className="text-heading-lg font-bold tracking-tight text-ink leading-none">
            klozer<span className="text-brand">.</span>
          </span>
        </Link>

        {/* Bottom Copyright Text */}
        <div className="relative z-10 text-body-sm font-medium text-brand-soft/60 text-center tracking-wide">
          © 2026 Klozer. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN: Clean Minimalist Login Form */}
      <div className="flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 bg-canvas lg:bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile Brand Logo (Clickable -> Landing Page) */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8 no-underline" title="Kembali ke Beranda Klozer">
            <KlozerIcon className="w-10 h-10 rounded-xl shadow-sm flex-shrink-0" />
            <span className="text-heading-md font-bold tracking-tight text-ink">
              klozer<span className="text-brand">.</span>
            </span>
          </Link>

          <h1 className="text-heading-md sm:text-heading font-bold text-ink tracking-tight">
            Selamat Datang
          </h1>
          <p className="text-body-sm text-fg-muted mt-1 mb-7 font-medium">
            Silakan masuk ke dashboard agen Anda.
          </p>

          {!errorMsg && sessionExpired && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-label font-semibold flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Sesi Anda telah berakhir. Silakan masuk kembali.</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-label font-semibold flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-body-sm font-bold text-charcoal mb-1.5">
                Email Akun
              </label>
              <div className="relative rounded-xl border border-line bg-white flex items-center px-3.5 py-2.5 shadow-2xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-all">
                <MailIcon className="w-4 h-4 text-fg-subtle mr-2.5 flex-shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="nama@klozer.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-body-sm text-charcoal font-semibold placeholder-fg-subtle outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-body-sm font-bold text-charcoal">
                  Kata Sandi
                </label>
                <a href="#" className="text-label font-bold text-brand hover:underline">
                  Lupa sandi?
                </a>
              </div>
              <div className="relative rounded-xl border border-line bg-white flex items-center px-3.5 py-2.5 shadow-2xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-all">
                <KeyIcon className="w-4 h-4 text-fg-subtle mr-2.5 flex-shrink-0" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-body-sm text-charcoal font-semibold placeholder-fg-subtle outline-none bg-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-body-sm shadow-md hover:shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk Dashboard</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-line text-center text-body-sm text-fg-muted">
            Belum punya akun?{" "}
            <Link href="/register" className="font-bold text-brand hover:underline">
              Daftar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be prerendered.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
