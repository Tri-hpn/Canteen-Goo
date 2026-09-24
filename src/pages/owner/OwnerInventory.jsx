// ============================================================
// OWNERINVENTORY.JSX — Quản lý kho nguyên liệu (Admin)
// ============================================================
// Tính năng:
//   - Danh sách nguyên liệu + search
//   - Thêm / Sửa / Xoá nguyên liệu
//   - Nhập kho (tăng số lượng + ghi log)
//   - Xem lịch sử nhập kho
//   - Cảnh báo khi tồn kho dưới mức tối thiểu
//
// Endpoints:
//   - api.inventory.list / create / update / remove
//   - api.inventory.import(code, data)
//   - api.inventory.imports()
//
// Lưu ý:
//   - Mã nguyên liệu tự sinh dựa trên mã lớn nhất + 1
//     (không dùng list.length vì có thể trùng)
//   - Badge trạng thái dùng CSS class .inv-badge--xxx
//     → dark mode tự đổi màu
// ============================================================
import { SkeletonTable } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, Search, Edit, Trash2, AlertTriangle, Package,
  History, X, Loader2, AlertCircle, PackageX, Boxes,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const UNITS = ["kg", "g", "lít", "ml", "chai", "hộp", "cái", "phần"];

const MODAL_Z = 2147483600;
const IMPORT_HISTORY_LIMIT = 30;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerInventory() {
  // ---------- List state ----------
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- Import history ----------
  const [imports, setImports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ---------- Search ----------
  const [q, setQ] = useState("");

  // ---------- Modals ----------
  const [modal, setModal] = useState(null);         // Add/Edit
  const [importModal, setImportModal] = useState(null); // Import stock
  const [saving, setSaving] = useState(false);

  // ---------- Load ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.inventory.list();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Không tải được danh sách kho");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImports = useCallback(async () => {
    try {
      const data = await api.inventory.imports();
      setImports(Array.isArray(data) ? data : []);
    } catch {
      setImports([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadImports();
  }, [load, loadImports]);

  // ESC đóng modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (importModal && !saving) setImportModal(null);
      else if (modal && !saving) setModal(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, importModal, saving]);

  // ---------- Computed (memo) ----------

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const s = q.toLowerCase().trim();
    return list.filter(
      (x) =>
        x.name?.toLowerCase().includes(s) ||
        x.code?.toLowerCase().includes(s)
    );
  }, [list, q]);

  const stats = useMemo(() => {
    const low = list.filter((x) => x.qty < x.min);
    const out = list.filter((x) => x.qty === 0);
    return {
      total: list.length,
      lowCount: low.length,
      outCount: out.length,
      okCount: list.length - low.length,
      lowItems: low,
    };
  }, [list]);

  // ---------- Code generation ----------

  /**
   * Sinh mã nguyên liệu mới dựa trên mã LỚN NHẤT hiện có + 1
   * Tránh trùng khi list có mã không liên tục (VD: NL001, NL003, NL005 → NL006)
   */
  const generateNextCode = () => {
    if (!list.length) return "NL001";
    const maxNum = list.reduce((max, x) => {
      const match = String(x.code || "").match(/(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return n > max ? n : max;
    }, 0);
    return "NL" + String(maxNum + 1).padStart(3, "0");
  };

  // ---------- Handlers ----------

  const saveItem = async (e) => {
    e.preventDefault();
    if (saving) return;

    const f = new FormData(e.currentTarget);
    const data = {
      code: f.get("code")?.trim().toUpperCase(),
      name: f.get("name")?.trim(),
      qty: Number(f.get("qty")),
      unit: f.get("unit"),
      min: Number(f.get("min")),
    };

    // Validate
    if (!data.code) return toast("Vui lòng nhập mã nguyên liệu", "error");
    if (!data.name) return toast("Vui lòng nhập tên nguyên liệu", "error");
    if (data.qty < 0) return toast("Số lượng không được âm", "error");
    if (data.min < 0) return toast("Mức tối thiểu không được âm", "error");

    setSaving(true);
    try {
      if (modal.code) {
        await api.inventory.update(modal.code, data);
        toast("Đã cập nhật nguyên liệu", "success");
      } else {
        await api.inventory.create(data);
        toast("Đã thêm nguyên liệu", "success");
      }
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (code) => {
    if (!confirm(`Xóa nguyên liệu "${code}"?`)) return;
    try {
      await api.inventory.remove(code);
      toast("Đã xóa", "success");
      load();
    } catch (e) {
      toast(e.message || "Không xóa được", "error");
    }
  };

  const doImport = async (e) => {
    e.preventDefault();
    if (saving) return;

    const f = new FormData(e.currentTarget);
    const qty = Number(f.get("qty"));

    // Validate
    if (!qty || qty <= 0) {
      return toast("Số lượng nhập phải lớn hơn 0", "error");
    }

    setSaving(true);
    try {
      const res = await api.inventory.import(importModal.code, {
        qty,
        supplier: f.get("supplier")?.trim(),
        note: f.get("note")?.trim(),
      });
      toast(
        `Đã nhập ${res?.record?.qty ?? qty} ${importModal.unit}`,
        "success"
      );
      setImportModal(null);
      load();
      loadImports();
    } catch (e) {
      toast(e.message || "Không nhập được", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Helpers ----------

  const getStatusKey = (x) => {
    if (x.qty === 0) return "out";
    if (x.qty < x.min) return "low";
    return "ok";
  };

  const getStatusLabel = (key) => {
    if (key === "out") return "Hết hàng";
    if (key === "low") return "Sắp hết";
    return "Còn hàng";
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============================================================
          ALERT — Tồn kho thấp
          ============================================================ */}
      {stats.lowCount > 0 && (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#92400e",
            padding: "16px 20px",
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <b style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
              ⚠️ Cảnh báo tồn kho thấp
            </b>
            <div style={{ fontSize: 12.5, opacity: 0.9 }}>
              {stats.lowCount} nguyên liệu dưới mức tối thiểu
              {stats.outCount > 0 && ` (${stats.outCount} đã hết)`}.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 10,
            padding: "10px 14px",
            flex: 1,
            minWidth: 240,
            maxWidth: 400,
          }}
        >
          <Search size={18} style={{ color: "var(--text-light, #8993a3)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm nguyên liệu..."
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              fontSize: 13,
              background: "transparent",
              color: "var(--text-primary, #172033)",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--text-light, #8993a3)",
                padding: 2,
              }}
              aria-label="Xoá tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: showHistory ? "#18a967" : "var(--card-bg, #fff)",
            color: showHistory ? "#fff" : "var(--text-primary, #172033)",
            padding: "10px 16px",
            border: "1px solid " + (showHistory ? "#18a967" : "var(--border-color, #e5e9ef)"),
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <History size={16} /> {showHistory ? "Ẩn lịch sử" : "Lịch sử nhập"}
        </button>

        <button
          onClick={() => setModal({})}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#2634d5",
            color: "#fff",
            padding: "10px 16px",
            border: 0,
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <Plus size={16} /> Thêm nguyên liệu
        </button>
      </div>

      {/* ============================================================
          STATS
          ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatBox label="Tổng nguyên liệu" value={stats.total} color="#2634d5" icon={<Boxes size={18} />} />
        <StatBox label="Sắp hết"          value={stats.lowCount} color="#f59e0b" icon={<AlertTriangle size={18} />} />
        <StatBox label="Hết hàng"          value={stats.outCount} color="#ef4444" icon={<PackageX size={18} />} />
        <StatBox label="Đủ hàng"           value={stats.okCount}  color="#18a967" icon={<Package size={18} />} />
      </div>

      {/* ============================================================
          MAIN TABLE
          ============================================================ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
             {/* Loading — skeleton table */}
        {loading && (
          <SkeletonTable
            columns={7}
            rows={5}
            headers={["Mã", "Nguyên liệu", "Số lượng", "Đơn vị", "Tối thiểu", "Trạng thái", "Thao tác"]}
          />
        )}
        {/* Error */}
        {!loading && error && (
          <ErrorBox message={error} onRetry={load} />
        )}

        {/* Data */}
        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thStyle}>Mã</th>
                  <th style={thStyle}>Nguyên liệu</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Số lượng</th>
                  <th style={thStyle}>Đơn vị</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Tối thiểu</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => {
                  const statusKey = getStatusKey(x);
                  return (
                    <tr
                      key={x.code}
                      style={{ borderBottom: "1px solid var(--border-color, #eef2f7)" }}
                    >
                      <td style={tdStyle}>
                        <b style={{ fontFamily: "monospace", fontSize: 12 }}>{x.code}</b>
                      </td>
                      <td style={tdStyle}>{x.name}</td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        <span className={`inv-qty inv-qty--${statusKey}`}>
                          {x.qty}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-muted, #64748b)" }}>
                        {x.unit}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {x.min}
                      </td>
                      <td style={tdStyle}>
                        <span className={`inv-badge inv-badge--${statusKey}`}>
                          {getStatusLabel(statusKey)}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <IconButton
                            onClick={() => setImportModal(x)}
                            title="Nhập kho"
                            color="#18a967"
                            bg="#18a967"
                          >
                            <Package size={15} />
                          </IconButton>
                          <IconButton
                            onClick={() => setModal(x)}
                            title="Sửa"
                          >
                            <Edit size={15} />
                          </IconButton>
                          <IconButton
                            onClick={() => removeItem(x.code)}
                            title="Xóa"
                            color="#ef4444"
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      <PackageX size={36} style={{ opacity: 0.35, marginBottom: 10 }} />
                      <div>
                        {q
                          ? `Không có nguyên liệu khớp "${q}"`
                          : "Chưa có nguyên liệu nào"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          IMPORT HISTORY
          ============================================================ */}
      {showHistory && (
        <div
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 12,
            padding: 20,
            marginTop: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "var(--text-primary, #172033)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15,
            }}
          >
            <History size={18} />
            Lịch sử nhập kho ({imports.length})
          </h3>

          {imports.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-light, #8993a3)",
                fontSize: 13,
              }}
            >
              Chưa có lịch sử nhập kho
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                    <th style={thStyle}>Thời gian</th>
                    <th style={thStyle}>Nguyên liệu</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>SL nhập</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Tồn sau</th>
                    <th style={thStyle}>Người nhập</th>
                    <th style={thStyle}>Nhà cung cấp</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.slice(0, IMPORT_HISTORY_LIMIT).map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid var(--border-color, #eef2f7)" }}
                    >
                      <td style={{ ...tdStyle, fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td style={tdStyle}>
                        <b>{r.name}</b>{" "}
                        <span style={{ color: "var(--text-light, #94a3b8)", fontFamily: "monospace", fontSize: 11 }}>
                          ({r.code})
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: "#18a967",
                          fontWeight: 700,
                        }}
                      >
                        +{r.qty} {r.unit}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {r.after} {r.unit}
                      </td>
                      <td style={tdStyle}>{r.imported_by}</td>
                      <td style={{ ...tdStyle, color: "var(--text-muted, #64748b)" }}>
                        {r.supplier || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {imports.length > IMPORT_HISTORY_LIMIT && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "10px 0",
                    fontSize: 12,
                    color: "var(--text-light, #8993a3)",
                  }}
                >
                  Hiển thị {IMPORT_HISTORY_LIMIT} / {imports.length} bản ghi gần nhất
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ADD / EDIT MODAL
          ============================================================ */}
      {modal && (
        <Modal onClose={() => !saving && setModal(null)} maxWidth={480}>
          <div style={modalHeaderStyle}>
            <h3 style={modalTitleStyle}>
              {modal.code ? "Sửa nguyên liệu" : "Thêm nguyên liệu"}
            </h3>
            <button
              onClick={() => !saving && setModal(null)}
              style={modalCloseStyle}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveItem} autoComplete="off">
            <label style={labelStyle}>Mã *</label>
            <input
              name="code"
              defaultValue={modal.code || generateNextCode()}
              required
              disabled={!!modal.code}
              style={{
                ...inputStyle,
                fontFamily: "monospace",
                textTransform: "uppercase",
                background: modal.code
                  ? "var(--bg-tertiary, #f5f7fb)"
                  : "var(--bg-secondary, #fff)",
                cursor: modal.code ? "not-allowed" : "text",
                opacity: modal.code ? 0.7 : 1,
              }}
              autoFocus={!modal.code}
            />

            <label style={labelStyle}>Tên nguyên liệu *</label>
            <input
              name="name"
              defaultValue={modal.name || ""}
              required
              style={inputStyle}
              autoFocus={!!modal.code}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Số lượng</label>
                <input
                  name="qty"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={modal.qty ?? 0}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Đơn vị</label>
                <select
                  name="unit"
                  defaultValue={modal.unit || "kg"}
                  style={inputStyle}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={labelStyle}>Mức tối thiểu (cảnh báo khi dưới)</label>
            <input
              name="min"
              type="number"
              min="0"
              step="0.1"
              defaultValue={modal.min ?? 10}
              required
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                style={{ ...btnCancelStyle, flex: 1 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ ...btnPrimaryStyle(saving), flex: 1, width: "auto" }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================
          IMPORT STOCK MODAL
          ============================================================ */}
      {importModal && (
        <Modal onClose={() => !saving && setImportModal(null)} maxWidth={480}>
          <div style={modalHeaderStyle}>
            <h3 style={modalTitleStyle}>
              <Package size={20} style={{ color: "#18a967" }} /> Nhập kho
            </h3>
            <button
              onClick={() => !saving && setImportModal(null)}
              style={modalCloseStyle}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Info box */}
          <div
            style={{
              background: "var(--bg-tertiary, #f5f7fb)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <b>{importModal.name}</b>{" "}
              <span style={{ color: "var(--text-light, #94a3b8)", fontFamily: "monospace", fontSize: 11 }}>
                ({importModal.code})
              </span>
            </div>
            <div style={{ color: "var(--text-muted, #64748b)" }}>
              Tồn hiện tại:{" "}
              <b style={{ color: "var(--text-primary, #172033)" }}>
                {importModal.qty} {importModal.unit}
              </b>
            </div>
          </div>

          <form onSubmit={doImport} autoComplete="off">
            <label style={labelStyle}>
              Số lượng nhập ({importModal.unit}) *
            </label>
            <input
              name="qty"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={10}
              required
              autoFocus
              style={{ ...inputStyle, fontSize: 14 }}
            />

            <label style={labelStyle}>Nhà cung cấp</label>
            <input
              name="supplier"
              placeholder="VD: Công ty TNHH ABC"
              style={inputStyle}
            />

            <label style={labelStyle}>Ghi chú</label>
            <textarea
              name="note"
              placeholder="VD: Hàng tươi, nhập buổi sáng..."
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setImportModal(null)}
                disabled={saving}
                style={{ ...btnCancelStyle, flex: 1 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...btnPrimaryStyle(saving),
                  background: saving ? "#94a3b8" : "#18a967",
                  flex: 1,
                  width: "auto",
                }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Đang nhập...
                  </>
                ) : (
                  <>
                    <Package size={14} /> Nhập kho
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatBox({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: color + "18",
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
          {label}
        </span>
        <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children, onClick, title,
  color = "var(--text-primary, #172033)",
  bg = "var(--card-bg, #fff)",
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        padding: 6,
        border: "1px solid " + (bg !== "var(--card-bg, #fff)" ? bg : "var(--border-color, #e5e9ef)"),
        borderRadius: 6,
        background: bg,
        cursor: "pointer",
        color,
        display: "grid",
        placeItems: "center",
        width: 30,
        height: 30,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 30,
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: 10,
        color: "#ef4444",
      }}
    >
      <AlertCircle size={26} style={{ marginBottom: 10 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Không tải được dữ liệu
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: onRetry ? 12 : 0 }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

function Modal({ children, onClose, maxWidth = 480 }) {
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: MODAL_Z,
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};

const tdStyle = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 12,
  color: "var(--text-muted, #475569)",
};

const inputStyle = {
  width: "100%",
  padding: 10,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  outline: "none",
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  boxSizing: "border-box",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const modalTitleStyle = {
  margin: 0,
  color: "var(--text-primary, #172033)",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const modalCloseStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 4,
  display: "grid",
  placeItems: "center",
};

const btnPrimaryStyle = (disabled) => ({
  padding: 12,
  background: disabled ? "#94a3b8" : "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 13,
});

const btnCancelStyle = {
  padding: 12,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  background: "var(--card-bg, #fff)",
  cursor: "pointer",
  color: "var(--text-primary, #172033)",
  fontWeight: 600,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const loadingBoxStyle = {
  textAlign: "center",
  padding: 40,
  color: "var(--text-light, #8993a3)",
};