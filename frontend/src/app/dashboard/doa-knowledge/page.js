"use client";
import { useState } from "react";
import {
  BookOpenIcon,
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  MicIcon,
  ZapIcon,
} from "@/components/icons";

export default function SupervisorDoaKnowledgePage() {
  const [isPlayingAudio, setIsPlayingAudio] = useState(null);

  const [prayers, setPrayers] = useState([
    {
      id: "DOA-01",
      category: "Zakat Maal & Harta",
      arabicText: "آجَرَكَ اللهُ فِيْمَا أَعْطَيْتَ، وَبَارَكَ فِيْمَا أَبْقَيْتَ، وَجَعَلَهُ لَكَ طَهُوْرًا",
      latinText: "Aajarokallaahu fiimaa a'thoyta, wa baaraka fiimaa abqoyta, wa ja'alahu laka thohuuroon.",
      translation: "Semoga Allah memberikan pahala atas apa yang engkau berikan, memberkahi apa yang engkau sisakan, dan menjadikannya pembersih bagimu.",
      voiceAudioPreview: "Suara Nova (Kharismatik)",
    },
    {
      id: "DOA-02",
      category: "Sedekah Subuh & Hajat",
      arabicText: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
      latinText: "Rabbanaa taqabbal minnaa innaka antas samii'ul 'aliim.",
      translation: "Ya Tuhan kami, terimalah amal dari kami, sungguh Engkaulah Yang Maha Mendengar lagi Maha Mengetahui.",
      voiceAudioPreview: "Suara Alloy (Teduh)",
    },
    {
      id: "DOA-03",
      category: "Wakaf Jariyah Sumur & Quran",
      arabicText: "إِذَا مَاتَ ابْنُ آدَمَ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ: صَدَقَةٍ جَارِيَةٍ...",
      latinText: "Izaa maata ibnu aadama inqatha'a 'amaluhu illaa min tsalaats: shadaqatin jaariyah...",
      translation: "Semoga wakaf ini menjadi amal jariyah yang pahalanya terus mengalir tanpa henti hingga hari akhir kelak.",
      voiceAudioPreview: "Suara Echo (Pria Wibawa)",
    },
  ]);

  const handleTestAudio = (id) => {
    setIsPlayingAudio(id);
    setTimeout(() => {
      setIsPlayingAudio(null);
      alert("Simulasi sintesis suara doa AI selesai (Audio siap dikirim via Voice Note WhatsApp).");
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <BookOpenIcon className="w-3.5 h-3.5" />
              <span>Basis Pengetahuan Doa (Mode NGO & Sosial)</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Basis Doa & Teks Apresiasi Donatur
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar doa harian yang dibacakan bot AI (melalui teks & voice note otomatis) saat donatur menyalurkan ZISWAF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Tambah Doa Baru...")}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <span>+ Tambah Doa Baru</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900 text-[13px]">
        <SparklesIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <div>
          <span className="font-bold block">Voice Note AI Otomatis untuk Donatur:</span>
          <span>Setiap donasi terverifikasi, AI dapat langsung mengirimkan voice note pembacaan doa yang dipersonalisasi dengan nama donatur.</span>
        </div>
      </div>

      {/* Prayers Cards */}
      <div className="flex flex-col gap-4">
        {prayers.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ede8e2]">
              <span className="badge badge-lavender text-[12px] font-bold">
                {p.category}
              </span>
              <button
                type="button"
                onClick={() => handleTestAudio(p.id)}
                disabled={isPlayingAudio === p.id}
                className="px-3.5 py-1.5 rounded-xl bg-[#edeffe] text-[#2545ff] hover:bg-[#2545ff] hover:text-white text-[12px] font-bold flex items-center gap-1.5 transition-all border-none cursor-pointer self-start sm:self-auto"
              >
                <MicIcon className="w-4 h-4" />
                <span>{isPlayingAudio === p.id ? "Memutar Audio..." : `Tes Suara AI (${p.voiceAudioPreview})`}</span>
              </button>
            </div>

            <div className="text-right text-[22px] font-serif leading-loose text-[#1e2640] py-2">
              {p.arabicText}
            </div>

            <div className="p-3.5 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] flex flex-col gap-1 text-[13px]">
              <span className="font-bold text-[#1e2640] italic">{p.latinText}</span>
              <span className="text-[#5a6380] mt-1">{p.translation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
