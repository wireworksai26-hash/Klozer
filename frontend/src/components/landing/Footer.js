import Link from "next/link";
import Logo from "@/components/common/Logo";

export default function Footer() {
  return (
    <footer className="bg-[#0c1754] text-white pt-20 pb-12 border-t border-white/10 relative z-30">
      <div className="max-w-[1480px] w-full mx-auto px-6 sm:px-10 lg:px-14 xl:px-16">
        
        {/* Main Footer Grid */}
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          
          {/* Left Column: Brand Logo & Newsletter */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Logo size="lg" variant="light" withIcon={true} />

            <div>
              <h4 className="text-[17px] font-bold text-white mb-2">
                Dapatkan tips otomatisasi WhatsApp di inbox Anda
              </h4>
              
              {/* Newsletter Form */}
              <div className="flex items-center gap-2 max-w-[420px] bg-white/10 rounded-full p-1 border border-white/20 mb-3">
                <input
                  type="email"
                  placeholder="Masukkan email bisnis Anda"
                  className="bg-transparent border-none outline-none text-[14px] text-white placeholder:text-white/60 px-4 flex-1"
                />
                <button className="btn-primary !py-2.5 !px-6 text-[14px] font-medium">
                  Langganan
                </button>
              </div>

              <label className="flex items-start gap-2 text-[12px] text-white/70 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 accent-[#2545ff]" />
                <span>Saya setuju menerima newsletter tips penjualan & pembaruan fitur Klozer.</span>
              </label>
            </div>
          </div>

          {/* Right Columns: Multi-Column Links */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8 text-[14px]">
            
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
                <li><a href="#faq" className="hover:text-white transition-colors no-underline">Pusat Bantuan</a></li>
                <li><a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline">WhatsApp Support</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors no-underline">Tanya Jawab (FAQ)</a></li>
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
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/70">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[12px]">in</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[12px]">fb</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[12px]">x</span>
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[12px]">ig</span>
          </div>

          <div className="flex items-center gap-6">
            <span>© 2026 Klozer. All rights reserved.</span>
            <span>Standar Keamanan Meta & Bank Indonesia</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
