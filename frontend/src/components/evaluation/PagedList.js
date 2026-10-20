"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { Button, ErrorState, LoadingState } from "@/components/ui";

function Chunk({ path, query, page, limit, renderItem, renderEmpty, isLast, onMore }) {
  const { t } = useDashboard();
  const result = useApi(path, { query: { ...query, page, limit } });

  if (result.error && !result.data) return <ErrorState error={result.error} onRetry={result.reload} />;
  if (!result.data) return <LoadingState />;

  const items = result.data.items ?? [];
  if (page === 1 && items.length === 0) return renderEmpty();
  const more = isLast && page * limit < (result.data.total ?? 0);

  return (
    <>
      {items.map(renderItem)}
      {more ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={onMore}>
            {t("Muat lebih banyak")}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/**
 * A list that grows page by page: each page is fetched by its own component, so loading more never refetches or
 * shifts the pages already shown. Remount it (change its `key`) to start again from page 1.
 */
export default function PagedList({ path, query, limit = 20, renderItem, renderEmpty }) {
  const [pages, setPages] = useState(1);
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: pages }, (_, index) => (
        <Chunk key={index + 1} path={path} query={query} page={index + 1} limit={limit} renderItem={renderItem} renderEmpty={renderEmpty} isLast={index + 1 === pages} onMore={() => setPages((n) => n + 1)} />
      ))}
    </div>
  );
}
