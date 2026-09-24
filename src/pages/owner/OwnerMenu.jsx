// ============================================================
// OWNERMENU.JSX — Quản lý thực đơn + danh mục (Admin)
// ============================================================
// Tính năng:
//   - Danh sách món + search + filter theo danh mục
//   - Thêm / Sửa / Xoá món
//   - Bật / Tắt trạng thái active món
//   - Quản lý danh mục (CRUD trong modal)
//
// Fixes (so với bản gốc):
//   - Fix bug `stock = 0` → dùng `??` thay vì `||`
//   - Form layout chia rõ: 3 cột giá + cột số lượng
//   - Image: ưu tiên ImageUploader > URL > ảnh cũ
//   - ✅ Thay confirm() native bằng ConfirmDialog custom (2 chỗ:
//     removeItem, removeCat)
// ============================================================
import { SkeletonTable } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, Search, Edit, Trash2, FolderPlus, Folder,
  X, Save, Loader2, AlertCircle, ToggleLeft, ToggleRight,
  UtensilsCrossed,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import ConfirmDialog from "../../components/ConfirmDialog";
import ImageUploader from "../../components/ImageUploader";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const DEFAULT_CATEGORY_ICON = "🍽️";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerMenu() {
  // ---------- List state ----------
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // ---------- Categories ----------
  const [categories, setCategories] = useState([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: DEFAULT_CATEGORY_ICON });
  const [editingCat, setEditingCat] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  // ---------- Item modal ----------
  const [modal, setModal] = useState(null);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);

  // ---------- ✅ Confirm dialog ----------
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ---------- Load ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, cats] = await Promise.all([
        api.menu.list("", "Tất cả", "popular", true),
        api.categories.list(),
      ]);
      setList(Array.isArray(items) ? items : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      setError(e.message || "Không tải được thực đơn");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ESC đóng modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (showCatModal && !catLoading) setShowCatModal(false);
      else if (modal && !saving) closeItemModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, showCatModal, catLoading, saving]);

  // ---------- Filter (memo) ----------

  const filtered = useMemo(() => {
    let result = list;
    if (q.trim()) {
      const s = q.toLowerCase().trim();
      result = result.filter((m) => m.name?.toLowerCase().includes(s));
    }
    if (filterCat) {
      result = result.filter((m) => m.category === filterCat);
    }
    return result;
  }, [list, q, filterCat]);

  // ---------- ✅ Confirm helpers ----------

  const closeConfirm = useCallback(() => {
    if (confirmBusy) return;
    setConfirm(null);
  }, [confirmBusy]);

  const runConfirm = useCallback(async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmBusy(false);
    }
  }, [confirm, confirmBusy]);

  // ---------- Item modal handlers ----------

  const openItemModal = (item = null) => {
    setImage(item?.image || "");
    setModal(item || {});
  };

  const closeItemModal = () => {
    setModal(null);
    setImage("");
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (saving) return;

    const f = new FormData(e.currentTarget);
    const price = Number(f.get("price"));
    const originalPrice = Number(f.get("original_price")) || price;
    const discountPercent = Number(f.get("discount_percent")) || 0;
    const stock = Number(f.get("stock"));

    if (!f.get("name")?.trim()) {
      return toast("Vui lòng nhập tên món", "error");
    }
    if (!price || price <= 0) {
      return toast("Giá phải lớn hơn 0", "error");
    }
    if (discountPercent < 0 || discountPercent > 90) {
      return toast("% giảm giá phải từ 0-90", "error");
    }
    if (stock < 0) {
      return toast("Số lượng không được âm", "error");
    }

    const data = {
      name: f.get("name").trim(),
      category: f.get("category"),
      price,
      original_price: originalPrice,
      discount_percent: discountPercent,
      stock,
      description: f.get("description")?.trim() || "",
      image: image || f.get("imageUrl")?.trim() || "",
      reason: f.get("reason")?.trim() || "",
    };

    setSaving(true);
    try {
      const id = modal._id || modal.id;
      if (id) {
        await api.menu.update(id, data);
        toast("Đã cập nhật món", "success");
      } else {
        await api.menu.create(data);
        toast("Đã thêm món mới", "success");
      }
      closeItemModal();
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    const newActive = item.active ? 0 : 1;
    try {
      await api.menu.update(item._id || item.id, { active: newActive });
      toast(newActive ? "Đã bật món" : "Đã tắt món", "success");
      load();
    } catch (e) {
      toast(e.message || "Không đổi được trạng thái", "error");
    }
  };

  /**
   * ✅ Xoá món — dùng ConfirmDialog.
   */
  const removeItem = (item) => {
    setConfirm({
      title: `Xóa món "${item.name}"?`,
      message:
        "Hành động này không thể hoàn tác. Món sẽ bị xoá khỏi thực đơn " +
        "và tất cả đánh giá liên quan cũng sẽ bị xoá.",
      confirmText: "Xóa vĩnh viễn",
      cancelText: "Hủy",
      danger: true,
      onConfirm: async () => {
        await api.menu.remove(item._id || item.id);
        toast("Đã xóa món", "success");
        setConfirm(null);
        load();
      },
    });
  };

  // ---------- Category handlers ----------

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", icon: DEFAULT_CATEGORY_ICON });
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      icon: cat.icon || DEFAULT_CATEGORY_ICON,
    });
  };

  const saveCat = async () => {
    const name = catForm.name.trim();
    if (!name) return toast("Nhập tên danh mục", "error");
    if (catLoading) return;

    setCatLoading(true);
    try {
      if (editingCat) {
        await api.categories.update(editingCat.id, {
          name,
          icon: catForm.icon,
        });
        toast("Đã cập nhật danh mục", "success");
      } else {
        await api.categories.create({ name, icon: catForm.icon });
        toast("Đã thêm danh mục", "success");
      }
      setEditingCat(null);
      setCatForm({ name: "", icon: DEFAULT_CATEGORY_ICON });
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setCatLoading(false);
    }
  };

  /**
   * ✅ Xoá danh mục — dùng ConfirmDialog.
   */
  const removeCat = (cat) => {
    setConfirm({
      title: `Xóa danh mục "${cat.name}"?`,
      message:
        "Danh mục sẽ bị xoá khỏi hệ thống. Các món thuộc danh mục này " +
        "vẫn được giữ nhưng sẽ không có danh mục.",
      confirmText: "Xóa danh mục",
      cancelText: "Hủy",
      danger: true,
      onConfirm: async () => {
        await api.categories.remove(cat.id);
        toast("Đã xóa danh mục", "success");
        setConfirm(null);
        load();
      },
    });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div>
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
              minWidth: 220,
              maxWidth: 400,
            }}
          >
            <Search size={18} style={{ color: "var(--text-light, #8993a3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm món ăn..."
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
                style={clearBtnStyle}
                aria-label="Xoá tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 10,
              fontSize: 13,
              outline: "none",
              background: "var(--card-bg, #fff)",
              color: "var(--text-primary, #172033)",
              cursor: "pointer",
              minWidth: 140,
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          <button onClick={() => openItemModal(null)} style={btnPrimaryStyle}>
            <Plus size={16} /> Thêm món
          </button>

          <button
            onClick={() => {
              openAddCat();
              setShowCatModal(true);
            }}
            style={btnOutlineStyle}
          >
            <FolderPlus size={16} /> Quản lý danh mục
          </button>
        </div>

        {/* ============================================================
            TABLE
            ============================================================ */}
        <div
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 12,
            padding: 20,
          }}
        >
                    {loading && (
            <SkeletonTable
              columns={7}
              rows={5}
              headers={["Ảnh", "Món", "Danh mục", "Giá", "Tồn", "Hiển thị", "Thao tác"]}
            />
          )}

          {!loading && error && (
            <ErrorBox message={error} onRetry={load} />
          )}

          {!loading && !error && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                    <th style={thStyle}>Ảnh</th>
                    <th style={thStyle}>Món</th>
                    <th style={thStyle}>Danh mục</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Giá</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Tồn</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Hiển thị</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const itemId = m._id || m.id;
                    const hasDiscount = m.discount_percent > 0;
                    const isActive = !!m.active;

                    return (
                      <tr
                        key={itemId}
                        style={{
                          borderBottom: "1px solid var(--border-color, #eef2f7)",
                          opacity: isActive ? 1 : 0.5,
                        }}
                      >
                        <td style={tdStyle}>
                          <img
                            src={m.image}
                            alt={m.name}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              objectFit: "cover",
                              border: "1px solid var(--border-color, #e5e9ef)",
                            }}
                            onError={(e) => {
                              e.target.src =
                                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f5f7fb' width='100' height='100'/><text x='50' y='55' font-size='40' text-anchor='middle'>🍽️</text></svg>";
                            }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <b style={{ display: "block", marginBottom: 2 }}>{m.name}</b>
                          {m.description && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-light, #8993a3)",
                                display: "block",
                                maxWidth: 300,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.description}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: "var(--text-muted, #64748b)" }}>
                          {m.category}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {hasDiscount ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-light, #94a3b8)",
                                  textDecoration: "line-through",
                                }}
                              >
                                {money(m.original_price)}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <b style={{ color: "#ef4444", fontSize: 13 }}>
                                  {money(m.price)}
                                </b>
                                <span
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #ef4444, #f59e0b)",
                                    color: "#fff",
                                    padding: "1px 6px",
                                    borderRadius: 8,
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  -{m.discount_percent}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <b style={{ color: "#18a967", fontSize: 13 }}>
                              {money(m.price)}
                            </b>
                          )}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            color: m.stock === 0 ? "#ef4444" : "inherit",
                            fontWeight: m.stock === 0 ? 700 : 400,
                          }}
                        >
                          {m.stock}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
 <button
  onClick={() => toggleActive(m)}
  title={isActive ? "Tắt món" : "Bật món"}
  aria-label={isActive ? "Tắt món" : "Bật món"}
  aria-pressed={isActive}
  style={{
    background: isActive
      ? "rgba(24, 169, 103, 0.1)"
      : "rgba(148, 163, 184, 0.12)",
    border: 0,
    cursor: "pointer",
    color: isActive ? "#18a967" : "#94a3b8",
    padding: 6,
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    margin: "0 auto",
    transition: "all 0.2s",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.05)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
  }}
>
  {isActive ? (
    <ToggleRight size={30} strokeWidth={2.3} />
  ) : (
    <ToggleLeft size={30} strokeWidth={2.3} />
  )}
</button>
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
                              onClick={() => openItemModal(m)}
                              title="Sửa"
                            >
                              <Edit size={15} />
                            </IconButton>
                            <IconButton
                              onClick={() => removeItem(m)}
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
                        <UtensilsCrossed
                          size={36}
                          style={{ opacity: 0.35, marginBottom: 10 }}
                        />
                        <div>
                          {q || filterCat
                            ? "Không có món nào khớp bộ lọc"
                            : "Chưa có món nào — bấm \"Thêm món\" để bắt đầu"}
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
            CATEGORY MANAGEMENT MODAL
            ============================================================ */}
        {showCatModal && (
          <Modal onClose={() => !catLoading && setShowCatModal(false)} maxWidth={520}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>
                <Folder size={20} style={{ color: "#2634d5" }} /> Quản lý danh mục
              </h3>
              <button
                onClick={() => !catLoading && setShowCatModal(false)}
                style={modalCloseStyle}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Add/Edit form */}
            <div
              style={{
                background: "var(--bg-tertiary, #f5f7fb)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-muted, #475569)",
                  marginBottom: 8,
                }}
              >
                {editingCat ? "✏️ Sửa danh mục" : "➕ Thêm danh mục mới"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr auto",
                  gap: 8,
                }}
              >
                <input
                  value={catForm.icon}
                  onChange={(e) =>
                    setCatForm({ ...catForm, icon: e.target.value })
                  }
                  placeholder={DEFAULT_CATEGORY_ICON}
                  maxLength={4}
                  style={{
                    padding: 10,
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 8,
                    outline: "none",
                    textAlign: "center",
                    fontSize: 20,
                    background: "var(--card-bg, #fff)",
                  }}
                  aria-label="Icon danh mục"
                />
                <input
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                  placeholder="VD: Bún, Phở, Tráng miệng..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveCat();
                    }
                  }}
                  style={{
                    padding: 10,
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 8,
                    outline: "none",
                    background: "var(--card-bg, #fff)",
                    color: "var(--text-primary, #172033)",
                  }}
                />
                <button
                  onClick={saveCat}
                  disabled={catLoading || !catForm.name.trim()}
                  style={{
                    padding: "10px 16px",
                    background:
                      !catForm.name.trim() || catLoading ? "#94a3b8" : "#2634d5",
                    color: "#fff",
                    border: 0,
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor:
                      !catForm.name.trim() || catLoading
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {catLoading ? (
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingCat ? "Lưu" : "Thêm"}
                </button>
              </div>
              {editingCat && (
                <button
                  onClick={() => {
                    setEditingCat(null);
                    setCatForm({ name: "", icon: DEFAULT_CATEGORY_ICON });
                  }}
                  style={{
                    marginTop: 8,
                    background: "transparent",
                    border: 0,
                    color: "#ef4444",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <X size={12} /> Hủy sửa
                </button>
              )}
            </div>

            {/* List */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted, #475569)",
                marginBottom: 8,
              }}
            >
              Danh sách ({categories.length})
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--card-bg, #fff)",
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: "var(--bg-tertiary, #f5f7fb)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {cat.icon || DEFAULT_CATEGORY_ICON}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary, #172033)",
                        display: "block",
                      }}
                    >
                      {cat.name}
                    </b>
                    {cat.order && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-light, #8993a3)",
                        }}
                      >
                        Thứ tự: {cat.order}
                      </div>
                    )}
                  </div>
                  <IconButton
                    onClick={() => openEditCat(cat)}
                    title="Sửa"
                    color="#2634d5"
                  >
                    <Edit size={14} />
                  </IconButton>
                  <IconButton
                    onClick={() => removeCat(cat)}
                    title="Xóa"
                    color="#ef4444"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
              {categories.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "var(--text-light, #8993a3)",
                    fontSize: 13,
                  }}
                >
                  Chưa có danh mục nào
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCatModal(false)}
              style={{ ...btnPrimaryStyle, marginTop: 16, width: "100%" }}
            >
              Đóng
            </button>
          </Modal>
        )}

        {/* ============================================================
            ITEM MODAL (Add/Edit)
            ============================================================ */}
        {modal && (
          <Modal onClose={() => !saving && closeItemModal()} maxWidth={560}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>
                {modal._id || modal.id ? "Sửa món" : "Thêm món"}
              </h3>
              <button
                onClick={() => !saving && closeItemModal()}
                style={modalCloseStyle}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveItem} autoComplete="off">
              <label style={labelStyle}>Tên món *</label>
              <input
                name="name"
                defaultValue={modal.name || ""}
                required
                style={inputStyle}
                autoFocus
                disabled={saving}
              />

              <label style={labelStyle}>Danh mục</label>
              <select
                name="category"
                defaultValue={modal.category || "Cơm"}
                style={inputStyle}
                disabled={saving}
              >
                {categories.length === 0 && <option>Cơm</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>
                    Giá bán *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1000"
                    defaultValue={modal.price ?? 30000}
                    required
                    style={{ ...inputStyle, marginBottom: 0 }}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>Giá gốc</label>
                  <input
                    name="original_price"
                    type="number"
                    min="0"
                    step="1000"
                    defaultValue={modal.original_price ?? ""}
                    placeholder="VD: 50000"
                    style={{ ...inputStyle, marginBottom: 0 }}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>% Giảm</label>
                  <input
                    name="discount_percent"
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    defaultValue={modal.discount_percent ?? 0}
                    style={{ ...inputStyle, marginBottom: 0 }}
                    disabled={saving}
                  />
                </div>
              </div>

              <label style={labelStyle}>Số lượng *</label>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={modal.stock ?? 10}
                required
                style={inputStyle}
                disabled={saving}
              />

              <label style={labelStyle}>Mô tả</label>
              <textarea
                name="description"
                defaultValue={modal.description || ""}
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                disabled={saving}
              />

              <label style={labelStyle}>
                Lý do đổi giá (nếu có sửa giá)
              </label>
              <input
                name="reason"
                placeholder="VD: Tăng giá nguyên liệu, khuyến mãi..."
                style={inputStyle}
                disabled={saving}
              />

              <ImageUploader
                value={image}
                onChange={setImage}
                label="Ảnh món ăn (JPEG/PNG, tối đa 2MB)"
              />

              {!image && (
                <>
                  <label style={labelStyle}>Hoặc dán URL ảnh</label>
                  <input
                    name="imageUrl"
                    defaultValue={
                      modal.image?.startsWith("http") ? modal.image : ""
                    }
                    placeholder="https://..."
                    style={inputStyle}
                    disabled={saving}
                  />
                </>
              )}

              {!image && modal.image && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    background: "var(--bg-tertiary, #f8fafc)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <img
                    src={modal.image}
                    alt="Ảnh hiện tại"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                    Ảnh hiện tại (sẽ giữ nếu không chọn ảnh mới)
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={closeItemModal}
                  disabled={saving}
                  style={{ ...btnCancelStyle, flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ ...btnPrimaryStyle, flex: 1, width: "auto" }}
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
                    <>
                      <Save size={14} /> Lưu món
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* ============================================================
          ✅ CONFIRM DIALOG (removeItem / removeCat)
          ============================================================ */}
      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          danger={confirm.danger}
          loading={confirmBusy}
          onConfirm={runConfirm}
          onClose={closeConfirm}
        />
      )}
    </>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function IconButton({ children, onClick, title, color = "var(--text-primary, #172033)" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        padding: 6,
        border: "1px solid var(--border-color, #e5e9ef)",
        borderRadius: 6,
        background: "var(--card-bg, #fff)",
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
      <div
        style={{ fontSize: 13, opacity: 0.85, marginBottom: onRetry ? 12 : 0 }}
      >
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
  marginBottom: 14,
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

const clearBtnStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 2,
};

const btnPrimaryStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  background: "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
  textDecoration: "none",
};

const btnOutlineStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--card-bg, #fff)",
  color: "#2634d5",
  padding: "10px 16px",
  border: "1px solid #2634d5",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};

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