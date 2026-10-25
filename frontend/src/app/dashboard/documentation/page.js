"use client";
import ContactTeam from "@/components/common/ContactTeam";
import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import DocBlocks from "@/components/docs/DocBlocks";
import { Badge, Button, EmptyState, PageHeader, Switch } from "@/components/ui";
import { DOC_SECTIONS, guideById, guidesForRole, searchText } from "@/content/docs";

const ROLE_NAME = { owner: "Owner", spv: "Supervisor", cs: "CS", superadmin: "Admin Klozer" };

/** The documentation: every feature explained in plain language, for the role of the person reading. */
function DocumentationContent() {
  const { t, role, language } = useDashboard();
  const params = useSearchParams();
  const requested = params.get("topik");
  const [everything, setEverything] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const article = useRef(null);

  const base = useMemo(() => guidesForRole(role, { everything }), [role, everything]);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => (needle ? base.filter((g) => searchText(g).includes(needle)) : base), [base, needle]);

  // the guide on screen: the one picked, else the one in the address, else the first one the person can read
  const wanted = picked || requested;
  // a link to a guide always opens it; while searching, only a match can be on screen
  const active = visible.find((g) => g.id === wanted) || (needle ? null : guideById(wanted)) || visible[0] || null;
  const index = active ? visible.findIndex((g) => g.id === active.id) : -1;
  const previous = index > 0 ? visible[index - 1] : null;
  const next = index >= 0 && index < visible.length - 1 ? visible[index + 1] : null;

  // choosing another guide starts it at the top; opening the page leaves the header in view
  const choose = (id) => {
    setPicked(id);
    window.history.replaceState(null, "", `/dashboard/documentation?topik=${id}`);
    requestAnimationFrame(() => article.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  };

  const sections = DOC_SECTIONS.map((section) => ({ ...section, guides: visible.filter((g) => g.sectionId === section.id) })).filter((s) => s.guides.length);
  const sectionOf = (g) => DOC_SECTIONS.find((s) => s.id === g.sectionId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Dokumentasi")} description={t("Penjelasan semua fitur Klozer dengan bahasa sederhana: fungsinya, cara memakainya, dan hal yang perlu diingat.")} />
      {language === "en" ? <p className="text-label text-fg-muted rounded-xl border border-line bg-sunken px-4 py-2.5">{t("Isi panduan tersedia dalam Bahasa Indonesia.")}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-6 items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4" aria-label={t("Daftar panduan")}>
          <div>
            <label htmlFor="doc-search" className="sr-only">{t("Cari panduan")}</label>
            <input
              id="doc-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cari: token, QRIS, rekening")}
              className="w-full min-h-11 px-4 rounded-xl border border-line-strong bg-white text-body-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </div>
          <Switch checked={everything} onChange={setEverything} label={t("Tampilkan semua panduan")} description={everything ? t("Termasuk panduan untuk peran lain.") : t("Sekarang hanya yang untuk peran Anda.")} />

          {/* on a phone the list is one picker; on a wide screen it is the full list */}
          <div className="lg:hidden">
            <label htmlFor="doc-pick" className="sr-only">{t("Pilih panduan")}</label>
            <select id="doc-pick" value={active?.id ?? ""} onChange={(e) => choose(e.target.value)} className="w-full min-h-11 px-4 rounded-xl border border-line-strong bg-white text-body-sm text-fg">
              {sections.map((section) => (
                <optgroup key={section.id} label={t(section.title)}>
                  {section.guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <nav className="hidden lg:flex flex-col gap-5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1" aria-label={t("Daftar panduan")}>
            {sections.map((section) => (
              <div key={section.id} className="flex flex-col gap-1">
                <div className="text-caption font-bold uppercase tracking-wider text-fg-subtle px-3 mb-1">{t(section.title)}</div>
                {section.guides.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => choose(g.id)}
                    aria-current={active?.id === g.id ? "page" : undefined}
                    className={`text-left min-h-11 px-3 py-2 rounded-xl text-body-sm cursor-pointer border-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active?.id === g.id ? "bg-brand-soft text-ink font-semibold" : "bg-transparent text-fg-muted hover:bg-sunken"}`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          {needle ? <p className="text-label text-fg-muted" role="status">{t("{n} panduan cocok", { n: visible.length })}</p> : null}
        </aside>

        <article ref={article} className="bg-white rounded-2xl border border-line p-5 sm:p-8 flex flex-col gap-5 min-w-0 scroll-mt-4" aria-live="polite">
          {active ? (
            <>
              <header className="flex flex-col gap-3 pb-4 border-b border-line">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{t(sectionOf(active).title)}</Badge>
                  <span className="text-caption text-fg-muted">{t("Untuk")}: {active.for.map((r) => ROLE_NAME[r]).join(", ")}</span>
                </div>
                <h2 className="text-heading-md font-bold text-ink m-0">{active.title}</h2>
                <p className="text-body-sm text-fg-muted m-0">{active.summary}</p>
                {active.open ? (
                  <div>
                    <Button variant="secondary" size="sm" href={active.open}>
                      {t("Buka halamannya")}
                    </Button>
                  </div>
                ) : null}
              </header>

              <DocBlocks blocks={active.blocks} />

              <footer className="mt-4 pt-5 border-t border-line flex flex-col gap-4">
                <div className="flex flex-wrap justify-between gap-3">
                  {previous ? (
                    <Button variant="secondary" size="sm" onClick={() => choose(previous.id)}>
                      {t("Sebelumnya")}: {previous.title}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Button variant="secondary" size="sm" onClick={() => choose(next.id)}>
                      {t("Berikutnya")}: {next.title}
                    </Button>
                  ) : null}
                </div>
                <p className="text-label text-fg-muted m-0">
                  {t("Belum menemukan jawabannya? Buka panduan Masalah umum, atau hubungi tim Klozer.")}{" "}
                  <ContactTeam message="Halo tim Klozer, saya butuh bantuan." />
                </p>
              </footer>
            </>
          ) : (
            <EmptyState icon="search" title={t("Tidak ada panduan yang cocok")} body={t("Coba kata lain, atau nyalakan Tampilkan semua panduan.")} />
          )}
        </article>
      </div>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <Suspense fallback={null}>
      <DocumentationContent />
    </Suspense>
  );
}
