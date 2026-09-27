// ============================================================
// OWNERMENU.JSX — Quản lý thực đơn + danh mục (Admin)
// ============================================================
//
// 🚨🚨🚨 CẢNH BÁO CỰC KỲ QUAN TRỌNG 🚨🚨🚨
//
//   TUYỆT ĐỐI KHÔNG được filter `active` ở FE (Admin/Employee).
//
//   Backend GET /api/menu trả VỀ TẤT CẢ món (kể cả active=0).
//   FE chỉ filter theo `q` + `filterCat`.
//
//   Nếu bạn thêm `.filter(m => m.active)` vào biến `filtered`
//   → món tắt sẽ BIẾN MẤT sau khi F5 → bug "tắt món rồi mất món".
//
//   Customer mới được filter active — dùng api.menu.listActive().
//
// 🚨🚨🚨 CẢNH BÁO CỰC KỲ QUAN TRỌNG 🚨🚨🚨
//
// Hai hành động KHÁC NHAU — KHÔNG được nhầm lẫn:
//   - toggleActive(m)  → PUT /api/menu/:id {active: 0|1}  ← chỉ đổi trạng thái
//   - removeItem(m)    → DELETE /api/menu/:id              ← XÓA VĨNH VIỄN
//
// ============================================================

import { SkeletonTable } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, Search, Edit, Trash2, FolderPlus, Folder,
  X, Save, Loader2, AlertCircle,
  UtensilsCrossed, EyeOff, Eye,
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
const MAX_DISCOUNT = 90;

// ============================================================
// HELPER: DEBUG LOG
// ============================================================
// Bật/tắt log để debug việc toggle active
// Đặt DEBUG = false nếu không cần log

const DEBUG = true;

function dbg(...args) {
  if (DEBUG) console.log("[OwnerMenu]", ...args);
}

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
  const [catForm, setCatForm] = useState({
    name: "",
    icon: DEFAULT_CATEGORY_ICON,
    order: "",
  });
  const [editingCat, setEditingCat] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  // ---------- Item modal ----------
  const [modal, setModal] = useState(null);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);

  // ---------- Price fields ----------
  const [priceFields, setPriceFields] = useState({
    price: "",
    originalPrice: "",
    discountPercent: 0,
  });

  // ---------- Confirm dialog ----------
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ---------- Per-action loading (chống double-click) ----------
  const [togglingId, setTogglingId] = useState(null);

  // ---------- Load ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // ✅ `all=true` để chắc chắn backend trả TẤT CẢ món (kể cả active=0)
      const [items, cats] = await Promise.all([
        api.menu.list("", "Tất cả", "popular", true),
        api.categories.list(),
      ]);

      const itemsArr = Array.isArray(items) ? items : [];
      setList(itemsArr);
      setCategories(Array.isArray(cats) ? cats : []);

      // 🔍 DEBUG: đếm số món tắt để verify backend OK
      const inactiveCount = itemsArr.filter((m) => !m.active).length;
      dbg(
        `📦 Load xong: ${itemsArr.length} món (${inactiveCount} đã tắt)`
      );
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

  // Reset price fields khi mở modal khác
  useEffect(() => {
    if (!modal) return;
    setPriceFields({
      price: modal.price != null ? Number(modal.price) : "",
      originalPrice: modal.original_price ? String(modal.original_price) : "",
      discountPercent: Number(modal.discount_percent) || 0,
    });
  }, [modal]);

  // ---------- Filter (CHỈ q + filterCat — KHÔNG filter active) ----------
  //
  // 🚨 NẾU THÊM `.filter(m => m.active)` VÀO ĐÂY → BUG "F5 MẤT MÓN TẮT".
  //    Đừng làm vậy. Admin/Employee PHẢI thấy món tắt để có thể bật lại.
  //
  const filtered = useMemo(() => {
    let result = list;

    if (q.trim()) {
      const s = q.toLowerCase().trim();
      result = result.filter((m) => m.name?.toLowerCase().includes(s));
    }
    if (filterCat) {
      result = result.filter((m) => m.category === filterCat);
    }

    // ❌❌❌ TUYỆT ĐỐI KHÔNG THÊM DÒNG NÀY ❌❌❌
    // result = result.filter((m) => m.active);

    return result;
  }, [list, q, filterCat]);

  // ---------- Confirm helpers ----------

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

  // ---------- Price handlers ----------

  const hasOriginal = Number(priceFields.originalPrice) > 0;

  const handleOriginalChange = (v) => {
    const original = Number(v) || 0;
    setPriceFields((prev) => {
      if (original <= 0) {
        return { ...prev, originalPrice: v, discountPercent: 0 };
      }
      const d = Number(prev.discountPercent) || 0;
      const newPrice =
        d > 0 ? Math.round(original * (1 - d / 100)) : original;
      return { ...prev, originalPrice: v, price: newPrice };
    });
  };

  const handleDiscountChange = (v) => {
    const d = Math.max(0, Math.min(MAX_DISCOUNT, Number(v) || 0));
    setPriceFields((prev) => {
      const original = Number(prev.originalPrice) || 0;
      if (original <= 0) {
        return { ...prev, discountPercent: 0 };
      }
      const newPrice =
        d > 0 ? Math.round(original * (1 - d / 100)) : original;
      return { ...prev, discountPercent: d, price: newPrice };
    });
  };

  const handlePriceChange = (v) => {
    setPriceFields((prev) => ({ ...prev, price: v }));
  };

  // ---------- Item modal handlers ----------

  const openItemModal = (item = null) => {
    setImage(item?.image || "");
    setModal(item || {});
  };

  const closeItemModal = () => {
    setModal(null);
    setImage("");
    setPriceFields({
      price: "",
      originalPrice: "",
      discountPercent: 0,
    });
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (saving) return;

    const f = new FormData(e.currentTarget);
    const name = f.get("name")?.trim();
    const category = f.get("category");
    const stock = Number(f.get("stock"));

    if (!name) {
      return toast("Vui lòng nhập tên món", "error");
    }

    const currentId = modal._id || modal.id;
    const dup = list.find(
      (m) =>
        (m._id || m.id) !== currentId &&
        (m.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      return toast(
        `Đã có món "${dup.name}" — vui lòng đặt tên khác`,
        "error"
      );
    }

    const original = Number(priceFields.originalPrice) || 0;
    const d = Number(priceFields.discountPercent) || 0;
    let price = Number(priceFields.price) || 0;

    if (original > 0) {
      price = d > 0 ? Math.round(original * (1 - d / 100)) : original;
    }

    if (!price || price <= 0) {
      return toast("Giá phải lớn hơn 0", "error");
    }
    if (d < 0 || d > MAX_DISCOUNT) {
      return toast(`% giảm giá phải từ 0-${MAX_DISCOUNT}`, "error");
    }
    if (stock < 0) {
      return toast("Số lượng không được âm", "error");
    }

    const data = {
      name,
      category,
      price,
      original_price: original > 0 ? original : price,
      discount_percent: original > 0 ? d : 0,
      stock,
      description: f.get("description")?.trim() || "",
      image: image || f.get("imageUrl")?.trim() || "",
      reason: f.get("reason")?.trim() || "",
    };

    setSaving(true);
    try {
      if (currentId) {
        await api.menu.update(currentId, data);
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

  // ============================================================
  // ✅ TOGGLE ACTIVE — CHỈ đổi trạng thái, KHÔNG xóa
  // ============================================================
  //
  // 🚨 Hàm này CHỈ được gọi từ nút toggle switch (cột "Hiển thị").
  //    KHÔNG được gọi từ nút Xóa (cột "Thao tác").
  //
  //    1. Optimistic update state → UI phản hồi ngay
  //    2. Gọi PUT /api/menu/:id {active: 0|1}
  //    3. KHÔNG gọi load() để tránh remount làm mất animation
  //    4. Rollback nếu API fail
  //
  // ============================================================
  const toggleActive = async (item) => {
    const id = item._id || item.id;
    const oldActive = Number(item.active) || 0;
    const newActive = oldActive ? 0 : 1;

    // Chống double-click
    if (togglingId !== null) {
      dbg(`⏸️ Đang xử lý món khác, bỏ qua toggle id=${id}`);
      return;
    }

    dbg(`🔄 TOGGLE món "${item.name}" (id=${id}): ${oldActive} → ${newActive}`);
    dbg(`   → Sẽ gọi PUT /api/menu/${id} {active: ${newActive}}`);
    dbg(`   → KHÔNG gọi DELETE (không xóa)`);

    setTogglingId(id);

    // Optimistic update — đổi state ngay, UI mượt
    setList((prev) =>
      prev.map((m) =>
        (m._id || m.id) === id ? { ...m, active: newActive } : m
      )
    );

    try {
      // ✅ CHỈ gọi UPDATE — không bao giờ gọi REMOVE
      await api.menu.update(id, { active: newActive });

      dbg(`✅ Toggle thành công món "${item.name}"`);

      // Toast phân biệt rõ ràng với xóa
      if (newActive) {
        toast(`Đã BẬT bán món "${item.name}"`, "success");
      } else {
        toast(
          `Đã TẮT bán món "${item.name}" (món vẫn còn, chỉ ẩn với khách)`,
          "success"
        );
      }

      // ❌ KHÔNG gọi load() — giữ nguyên list để không mất món tắt
    } catch (e) {
      dbg(`❌ Toggle THẤT BẠI món "${item.name}":`, e.message);

      // Rollback state nếu API fail
      setList((prev) =>
        prev.map((m) =>
          (m._id || m.id) === id ? { ...m, active: oldActive } : m
        )
      );
      toast(e.message || "Không đổi được trạng thái", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================================
  // ✅ REMOVE — XÓA VĨNH VIỄN, có confirm dialog 2 lần
  // ============================================================
  //
  // 🚨 Hàm này CHỈ được gọi từ nút Xóa (icon thùng rác cột "Thao tác").
  //    KHÔNG được gọi từ nút toggle switch.
  //
  // ============================================================
  const removeItem = (item) => {
    const id = item._id || item.id;

    dbg(`🗑️ MỞ CONFIRM XÓA món "${item.name}" (id=${id})`);
    dbg(`   → Sẽ gọi DELETE /api/menu/${id} nếu user xác nhận`);

    setConfirm({
      title: `Xóa vĩnh viễn món "${item.name}"?`,
      message:
        "⚠️ HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC.\n\n" +
        "Món sẽ bị XÓA KHỎI DATABASE.\n" +
        "Khác với 'Tắt món' (chỉ ẩn khỏi khách, có thể bật lại).\n\n" +
        "Nếu bạn chỉ muốn ẩn tạm, hãy dùng nút Tắt ở cột Hiển thị.",
      confirmText: "XÓA VĨNH VIỄN",
      cancelText: "Hủy — Giữ lại",
      danger: true,
      onConfirm: async () => {
        dbg(`🗑️ THỰC THI XÓA món "${item.name}" (id=${id})`);
        await api.menu.remove(id);
        toast(`Đã XÓA vĩnh viễn món "${item.name}"`, "success");
        setConfirm(null);
        load();
      },
    });
  };

  // ---------- Category handlers ----------

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", icon: DEFAULT_CATEGORY_ICON, order: "" });
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      icon: cat.icon || DEFAULT_CATEGORY_ICON,
      order: cat.order != null ? String(cat.order) : "",
    });
  };

  const saveCat = async () => {
    const name = catForm.name.trim();
    if (!name) return toast("Nhập tên danh mục", "error");
    if (catLoading) return;

    const orderStr = String(catForm.order || "").trim();
    let order;
    if (orderStr) {
      order = Number(orderStr);
      if (!Number.isInteger(order) || order < 0) {
        return toast("Thứ tự phải là số nguyên >= 0", "error");
      }
    }

    setCatLoading(true);
    try {
      const payload = { name, icon: catForm.icon };
      if (order !== undefined) payload.order = order;

      if (editingCat) {
        await api.categories.update(editingCat.id, payload);
        toast("Đã cập nhật danh mục", "success");
      } else {
        await api.categories.create(payload);
        toast("Đã thêm danh mục", "success");
      }
      setEditingCat(null);
      setCatForm({ name: "", icon: DEFAULT_CATEGORY_ICON, order: "" });
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setCatLoading(false);
    }
  };

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

  // Debug stats
  const stats = useMemo(() => {
    const total = list.length;
    const active = list.filter((m) => Number(m.active) === 1).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [list]);

  return (
    <>
      <div>
        {/* ============ DEBUG BANNER ============ */}
        {DEBUG && (
          <div
            style={{
              background: "rgba(38, 52, 213, 0.08)",
              border: "1px solid rgba(38, 52, 213, 0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 12,
              color: "#2634d5",
              fontFamily: "monospace",
            }}
          >
            🔍 DEBUG: Tổng <b>{stats.total}</b> món ·{" "}
            <b style={{ color: "#18a967" }}>{stats.active} đang bán</b> ·{" "}
            <b style={{ color: "#f59e0b" }}>{stats.inactive} đã tắt</b>
          </div>
        )}

        {/* ============ TOOLBAR ============ */}
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

        {/* ============ TABLE ============ */}
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
              headers={[
                "Ảnh",
                "Món",
                "Danh mục",
                "Giá",
                "Tồn",
                "Hiển thị",
                "Thao tác",
              ]}
            />
          )}

          {!loading && error && <ErrorBox message={error} onRetry={load} />}

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
                    <th style={{ ...thStyle, textAlign: "center" }}>
                      Hiển thị
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const itemId = m._id || m.id;
                    const hasDiscount = m.discount_percent > 0;
                    const isActive = Number(m.active) === 1;
                    const isToggling = togglingId === itemId;

                    return (
                      <tr
                        key={itemId}
                        style={{
                          borderBottom:
                            "1px solid var(--border-color, #eef2f7)",
                          background: isActive
                            ? "transparent"
                            : "rgba(245, 158, 11, 0.06)",
                          borderLeft: isActive
                            ? "3px solid transparent"
                            : "3px solid #f59e0b",
                          transition: "background 0.2s, border-left 0.2s",
                          opacity: isToggling ? 0.6 : 1,
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
                          <b style={{ display: "block", marginBottom: 2 }}>
                            {m.name}
                          </b>
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
                        <td
                          style={{
                            ...tdStyle,
                            color: "var(--text-muted, #64748b)",
                          }}
                        >
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
                            color:
                              m.stock === 0 ? "#ef4444" : "inherit",
                            fontWeight: m.stock === 0 ? 700 : 400,
                          }}
                        >
                          {m.stock}
                        </td>

                        {/* ========== CỘT HIỂN THỊ — TOGGLE (KHÔNG XÓA) ========== */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => toggleActive(m)}
                              disabled={isToggling}
                              title={
                                isActive
                                  ? "TẮT BÁN món này (khách không thấy, món vẫn còn)"
                                  : "BẬT BÁN món này"
                              }
                              aria-label={
                                isActive ? "Tắt bán món" : "Bật bán món"
                              }
                              aria-pressed={isActive}
                              role="switch"
                              style={{
                                background: isActive ? "#18a967" : "#cbd5e1",
                                border: 0,
                                cursor: isToggling ? "wait" : "pointer",
                                width: 52,
                                height: 28,
                                borderRadius: 999,
                                padding: 0,
                                position: "relative",
                                display: "inline-block",
                                margin: "0 auto",
                                verticalAlign: "middle",
                                transition: "background-color 0.25s ease",
                                boxShadow: isActive
                                  ? "0 2px 8px rgba(24, 169, 103, 0.35)"
                                  : "inset 0 1px 3px rgba(0, 0, 0, 0.08)",
                                opacity: isToggling ? 0.7 : 1,
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: 3,
                                  left: isActive ? 27 : 3,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "#ffffff",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                                  transition:
                                    "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              />
                            </button>
                            {!isActive && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: "#f59e0b",
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Đã tắt
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ========== CỘT THAO TÁC — SỬA + XÓA ========== */}
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
                              title="Sửa món (không phải tắt)"
                            >
                              <Edit size={15} />
                            </IconButton>
                            <IconButton
                              onClick={() => removeItem(m)}
                              title="XÓA VĨNH VIỄN món này (khác với tắt)"
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
                            : 'Chưa có món nào — bấm "Thêm món" để bắt đầu'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============ CATEGORY MODAL ============ */}
        {showCatModal && (
          <Modal
            onClose={() => !catLoading && setShowCatModal(false)}
            maxWidth={560}
          >
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>
                <Folder size={20} style={{ color: "#0EA5E9" }} /> Quản lý danh
                mục
              </h3>
              <button
                onClick={() => !catLoading && setShowCatModal(false)}
                style={modalCloseStyle}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

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
                  gridTemplateColumns: "60px 1fr 80px auto",
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
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={catForm.order}
                  onChange={(e) =>
                    setCatForm({ ...catForm, order: e.target.value })
                  }
                  placeholder="Tự động"
                  title="Thứ tự hiển thị (để trống = tự động)"
                  style={{
                    padding: 10,
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 8,
                    outline: "none",
                    background: "var(--card-bg, #fff)",
                    color: "var(--text-primary, #172033)",
                    fontSize: 13,
                  }}
                  aria-label="Thứ tự hiển thị"
                />
                <button
                  onClick={saveCat}
                  disabled={catLoading || !catForm.name.trim()}
                  style={{
                    padding: "10px 16px",
                    background:
                      !catForm.name.trim() || catLoading
                        ? "#94a3b8"
                        : "#0EA5E9",
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
                    setCatForm({
                      name: "",
                      icon: DEFAULT_CATEGORY_ICON,
                      order: "",
                    });
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
                    color="#0EA5E9"
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

        {/* ============ ITEM MODAL ============ */}
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

              <label style={labelStyle}>Danh mục *</label>
              <select
                name="category"
                defaultValue={modal.category || (categories[0]?.name ?? "")}
                required
                style={inputStyle}
                disabled={saving}
              >
                {categories.length === 0 && (
                  <option value="">— Chưa có danh mục —</option>
                )}
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
                  marginBottom: 8,
                }}
              >
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>
                    Giá gốc
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={priceFields.originalPrice}
                    onChange={(e) => handleOriginalChange(e.target.value)}
                    placeholder="VD: 50000"
                    style={{ ...inputStyle, marginBottom: 0 }}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>% Giảm</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_DISCOUNT}
                    step="1"
                    value={priceFields.discountPercent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0 }}
                    disabled={saving || !hasOriginal}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginTop: 0 }}>
                    Giá bán {!hasOriginal && "*"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={priceFields.price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    required={!hasOriginal}
                    placeholder="VD: 30000"
                    style={{
                      ...inputStyle,
                      marginBottom: 0,
                      background: hasOriginal
                        ? "var(--bg-tertiary, #f5f7fb)"
                        : "var(--bg-secondary, #fff)",
                      cursor: hasOriginal ? "not-allowed" : "text",
                      opacity: hasOriginal ? 0.75 : 1,
                    }}
                    disabled={saving || hasOriginal}
                  />
                </div>
              </div>

              <div
                style={{
                  marginBottom: 14,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: hasOriginal
                    ? "rgba(14, 165, 233, 0.08)"
                    : "var(--bg-tertiary, #f8fafc)",
                  border: hasOriginal
                    ? "1px solid rgba(14, 165, 233, 0.25)"
                    : "1px solid var(--border-color, #e5e9ef)",
                  color: hasOriginal
                    ? "#0284C7"
                    : "var(--text-muted, #64748b)",
                }}
              >
                {hasOriginal ? (
                  <>
                    💰 Khách sẽ trả <b>{money(priceFields.price)}</b>
                    {priceFields.discountPercent > 0 && (
                      <>
                        {" "}
                        — giảm <b>{priceFields.discountPercent}%</b> từ{" "}
                        <span style={{ textDecoration: "line-through" }}>
                          {money(Number(priceFields.originalPrice) || 0)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>💡 Để trống Giá gốc nếu không giảm giá.</>
                )}
              </div>

              <label style={labelStyle}>Số lượng *</label>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={modal.stock ?? ""}
                placeholder="VD: 20"
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

              <label style={labelStyle}>Lý do đổi giá (nếu có sửa giá)</label>
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

function IconButton({
  children,
  onClick,
  title,
  color = "var(--text-primary, #172033)",
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      type="button"
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
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: onRetry ? 12 : 0 }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
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
  background: "var(--btn-primary, #2634d5)",
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
  color: "var(--btn-primary, #2634d5)",
  padding: "10px 16px",
  border: "1px solid var(--btn-primary, #2634d5)",
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