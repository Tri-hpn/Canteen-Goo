// ============================================================
// PAGINATION.JSX — Phân trang + chọn số item/trang
// ============================================================
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 20, 50, 100];

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Generate page numbers with ellipsis
  const pages = [];
  const maxShow = 5;
  let from = Math.max(1, page - Math.floor(maxShow / 2));
  let to = Math.min(totalPages, from + maxShow - 1);
  if (to - from + 1 < maxShow) from = Math.max(1, to - maxShow + 1);

  if (from > 1) {
    pages.push(1);
    if (from > 2) pages.push("...");
  }
  for (let i = from; i <= to; i++) pages.push(i);
  if (to < totalPages) {
    if (to < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  if (total === 0) return null;

  const btnBase = {
    minWidth: 32,
    height: 32,
    padding: "0 8px",
    border: "1px solid var(--border-color, #e5e9ef)",
    borderRadius: 8,
    background: "var(--card-bg, #fff)",
    color: "var(--text-primary, #172033)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--border-color, #eef2f7)",
      }}
    >
      {/* Info + page size */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-muted, #64748b)" }}>
          Hiển thị <b style={{ color: "var(--text-primary, #172033)" }}>{start}-{end}</b> / {total}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 8,
            fontSize: 13,
            background: "var(--bg-secondary, #fff)",
            color: "var(--text-primary, #172033)",
            cursor: "pointer",
          }}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / trang
            </option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            ...btnBase,
            opacity: page <= 1 ? 0.4 : 1,
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`dots-${i}`}
              style={{ padding: "0 6px", color: "var(--text-light, #94a3b8)" }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnBase,
                background:
                  p === page ? "#0EA5E9" : "var(--card-bg, #fff)",
                color: p === page ? "#fff" : "var(--text-primary, #172033)",
                borderColor: p === page ? "#0EA5E9" : "var(--border-color, #e5e9ef)",
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            ...btnBase,
            opacity: page >= totalPages ? 0.4 : 1,
            cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HOOK: dùng kèm Pagination
// ============================================================
import { useState, useMemo, useEffect } from "react";

export function usePagination(list, defaultSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset về trang 1 khi list đổi (VD filter)
  useEffect(() => {
    setPage(1);
  }, [total]);

  const paged = useMemo(() => {
    const s = (page - 1) * pageSize;
    return list.slice(s, s + pageSize);
  }, [list, page, pageSize]);

  return {
    page,
    pageSize,
    total,
    paged,
    setPage,
    setPageSize,
  };
}