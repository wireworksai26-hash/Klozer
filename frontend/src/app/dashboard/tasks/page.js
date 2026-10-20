"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { Async, Button, EmptyState, PageHeader, Tabs } from "@/components/ui";
import TaskCreateModal from "@/components/tasks/TaskCreateModal";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskFilters, { DEFAULT_FILTERS, isNarrowed } from "@/components/tasks/TaskFilters";
import TaskRulesPanel from "@/components/tasks/TaskRulesPanel";
import TaskSummary from "@/components/tasks/TaskSummary";
import TaskTable from "@/components/tasks/TaskTable";

const PAGE_SIZE = 25;

export default function TasksPage() {
  const { t, isManager, taskEvent } = useDashboard();
  const metaQuery = useApi("/tasks/meta");
  const [tab, setTab] = useState("list");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const query = useMemo(
    () => ({ status: filters.status, assignee: filters.person, type: filters.type, priority: filters.priority, overdue: filters.overdue ? "true" : "", q: filters.q, limit: PAGE_SIZE, offset }),
    [filters, offset]
  );
  const list = useApi("/tasks", { query });
  const { reload } = list;

  // a task changed anywhere (another person, an AI agent, a rule): show it
  useEffect(() => {
    if (taskEvent) reload();
  }, [taskEvent, reload]);

  // typing in the search box waits a moment before asking the server
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchText.trim();
      setFilters((f) => (f.q === q ? f : { ...f, q }));
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // the last task of the last page was removed: go back to the first page
  const emptyPage = list.data && list.data.data.length === 0 && list.data.total > 0 && offset > 0;
  useEffect(() => {
    // Moving to a page that exists is a reaction to the server's answer, not state derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (emptyPage) setOffset(0);
  }, [emptyPage]);

  const applyFilters = useCallback((next) => {
    setFilters(next);
    setOffset(0);
  }, []);
  const clearFilters = () => {
    setSearchText("");
    applyFilters(DEFAULT_FILTERS);
  };
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeDrawer = useCallback(() => setOpenId(null), []);

  const tabs = [
    { id: "list", label: t("Daftar") },
    { id: "rules", label: t("Aturan otomatis") },
  ];
  const showRules = isManager && tab === "rules";
  const meta = metaQuery.data?.data;
  const narrowed = isNarrowed(filters);
  const openCreate = () => {
    setTab("list");
    setCreating(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("Tugas")}
        description={t("Pekerjaan untuk tim: dari staf, agen AI dan aturan otomatis.")}
        actions={
          <Button icon="plus" onClick={openCreate} disabled={!meta}>
            {t("Buat tugas")}
          </Button>
        }
      />
      {isManager ? <Tabs tabs={tabs} value={tab} onChange={setTab} label={t("Bagian tugas")} /> : null}

      {showRules ? (
        <TaskRulesPanel />
      ) : (
        <Async query={metaQuery}>
          {(metaBody) => (
            <>
              {list.data ? <TaskSummary summary={list.data.summary} filters={filters} onApply={(next) => (setSearchText(""), applyFilters(next))} /> : null}
              <TaskFilters filters={filters} onChange={applyFilters} searchText={searchText} onSearchText={setSearchText} meta={metaBody.data} onClear={clearFilters} />
              <div aria-busy={list.loading} className={list.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                <Async query={list} loadingLabel={t("Memuat tugas...")}>
                  {(body) => {
                    const total = body.total;
                    const from = total === 0 ? 0 : offset + 1;
                    const to = Math.min(offset + PAGE_SIZE, total);
                    if (body.data.length) {
                      return (
                        <div className="flex flex-col gap-3">
                          <TaskTable tasks={body.data} onOpen={setOpenId} />
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-label text-fg-muted tabular-nums">{t("{from}-{to} dari {total}", { from, to, total })}</span>
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                                {t("Sebelumnya")}
                              </Button>
                              <Button variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                                {t("Berikutnya")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-white border border-line rounded-2xl">
                        {narrowed ? (
                          <EmptyState
                            icon="filter"
                            title={t("Tidak ada tugas yang cocok")}
                            body={t("Tidak ada tugas dengan filter ini. Hapus filter untuk melihat semua tugas aktif.")}
                            action={
                              <Button variant="secondary" onClick={clearFilters}>
                                {t("Hapus filter")}
                              </Button>
                            }
                          />
                        ) : (
                          <EmptyState
                            icon="task"
                            title={t("Belum ada tugas")}
                            body={t("Tugas datang dari staf, agen AI dan aturan otomatis. Buat yang pertama untuk mencatat pekerjaan yang harus ditindaklanjuti.")}
                            action={
                              <Button icon="plus" onClick={openCreate}>
                                {t("Buat tugas")}
                              </Button>
                            }
                          />
                        )}
                      </div>
                    );
                  }}
                </Async>
              </div>
            </>
          )}
        </Async>
      )}
      {creating && meta ? <TaskCreateModal meta={meta} onClose={closeCreate} onCreated={reload} /> : null}
      {openId && meta ? <TaskDrawer key={openId} taskId={openId} meta={meta} taskEvent={taskEvent} onClose={closeDrawer} onChanged={reload} /> : null}
    </div>
  );
}
