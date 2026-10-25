import Link from "next/link";
import Logo from "@/components/common/Logo";
import { LEGAL, whatsappUrl } from "@/utils/legal/config";

export default function Footer() {
  return (
    <footer className="bg-ink text-white pt-20 pb-12 border-t border-white/10 relative z-30">
      <div className="container-page">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Left Column: Brand Logo & Newsletter */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Logo size="lg" variant="light" withIcon={true} />

            <div>
              <h4 className="text-title font-bold text-white mb-2">
                Dapatkan tips otomatisasi WhatsApp di inbox Anda
              </h4>
              
              {/* Newsletter Form */}
              <div className="flex items-center gap-2 max-w-[420px] bg-white/10 rounded-full p-1 border border-white/20 mb-3">
                <input
                  type="email"
                  placeholder="Masukkan email bisnis Anda"
                  className="bg-transparent border-none outline-none text-body-sm text-white placeholder:text-white/60 px-4 flex-1 min-w-0"
                />
                <button className="btn-primary shrink-0 !py-2.5 !px-5 sm:!px-6 text-body-sm font-medium">
                  Langganan
                </button>
              </div>

              <label className="flex items-start gap-2 text-label text-white/70 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 accent-brand" />
                <span>Saya setuju menerima newsletter tips penjualan & pembaruan fitur Klozer.</span>
              </label>
            </div>
          </div>

          {/* Right Columns: Multi-Column Links */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8 text-body-sm">
            
            {/* Col 1 */}
            <div>
              <h5 className="font-bold text-white mb-4">Produk</h5>
              <ul className="flex flex-col gap-3 text-white/80">
                <li><a href="#fitur" className="hover:text-white transition-colors no-underline">Dynamic QRIS</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors no-underline">Voice Note AI</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors no-underline">Anti-Struk Palsu</a></li>
                <li><a href="#harga" className="hover:text-white transition-colors no-underline">Paket Harga</a></li>
              </ul>
            </div>

            {/* Col 2 */}
            <div>
              <h5 className="font-bold text-white mb-4">Penggunaan</h5>
              <ul className="flex flex-col gap-3 text-white/80">
                <li><a href="#solusi" className="hover:text-white transition-colors no-underline">Toko Online</a></li>
                <li><a href="#solusi" className="hover:text-white transition-colors no-underline">Brand Fashion</a></li>
                <li><a href="#solusi" className="hover:text-white transition-colors no-underline">Skincare & Retail</a></li>
                <li><a href="#solusi" className="hover:text-white transition-colors no-underline">Lembaga Donasi</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h5 className="font-bold text-white mb-4">Bantuan</h5>
              <ul className="flex flex-col gap-3 text-white/80">
                <li><Link href="/faq" className="hover:text-white transition-colors no-underline">Tanya Jawab (FAQ)</Link></li>
                <li><Link href="/bayar" className="hover:text-white transition-colors no-underline">Cara Bayar</Link></li>
                <li><Link href="/kontak" className="hover:text-white transition-colors no-underline">Kontak</Link></li>
                <li><Link href="/kebijakan-refund" className="hover:text-white transition-colors no-underline">Kebijakan Refund</Link></li>
                {whatsappUrl() && <li><a href={whatsappUrl("Halo tim Klozer, saya ingin bertanya tentang Klozer.")} target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline">WhatsApp: {LEGAL.phone}</a></li>}
                <li><a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-white transition-colors no-underline break-all">{LEGAL.contactEmail}</a></li>
                {LEGAL.instagramUrl && <li><a href={LEGAL.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline">Instagram {LEGAL.instagramHandle}</a></li>}
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h5 className="font-bold text-white mb-4">Perusahaan</h5>
              <ul className="flex flex-col gap-3 text-white/80">
                <li><Link href="/" className="hover:text-white transition-colors no-underline">Tentang Kami</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors no-underline">Masuk Dashboard</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors no-underline">Daftar Akun</Link></li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Bar: Social Icons & Legal */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-body-sm text-white/70">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-label">in</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-label">fb</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-label">x</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-label">ig</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/syarat-ketentuan" className="hover:text-white transition-colors no-underline">Syarat &amp; Ketentuan</Link>
            <Link href="/kebijakan-privasi" className="hover:text-white transition-colors no-underline">Kebijakan Privasi</Link>
            <span>© 2026 Klozer. All rights reserved.</span>
            <span>Standar Keamanan Meta & Bank Indonesia</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
