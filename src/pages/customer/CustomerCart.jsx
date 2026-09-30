// ============================================================
// CUSTOMERCART.JSX — Giỏ hàng khách hàng
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Trash2, Check, ArrowRight,
  Store, Pencil,
} from "lucide-react";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import { useTranslation } from "../../i18n";
import FoodDetailModal from "../../components/FoodDetailModal";
import ConfirmDialog from "../../components/ConfirmDialog";

const STORAGE_KEY = "canteen_cart_selected";
const DEFAULT_MAX_QTY = 99;

// ============================================================
// HELPERS
// ============================================================

function getMaxQty(item) {
  if (typeof item?.stock === "number") {
    return Math.max(1, item.stock);
  }
  return DEFAULT_MAX_QTY;
}

function readSavedSelection(cartKeys) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        const valid = arr.filter((k) => cartKeys.includes(k));
        if (valid.length > 0) return valid;
      }
    }
  } catch {}
  return cartKeys;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerCart({ cart, setCart }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const lines = useMemo(
    () => Object.entries(cart).map(([key, item]) => ({ ...item, _key: key })),
    [cart]
  );

  const cartKeys = useMemo(() => Object.keys(cart), [cart]);

  const [editingItem, setEditingItem] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() =>
    readSavedSelection(Object.keys(cart))
  );
  const [confirmRemove, setConfirmRemove] = useState(null);

  const prevKeysRef = useRef(cartKeys);

  // Persist selectedKeys
  useEffect(() => {
    try {
      if (selectedKeys.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
      }
    } catch {}
  }, [selectedKeys]);

  // ✅ FIX: Sync selectedKeys khi cart đổi, bao gồm cả khi cart rỗng hoàn toàn
  // (ví dụ: sau khi đặt hàng, cart bị xóa sạch bởi checkout)
  useEffect(() => {
    const prevKeys = prevKeysRef.current;
    const newKeys = cartKeys.filter((k) => !prevKeys.includes(k));
    const removedSet = new Set(prevKeys.filter((k) => !cartKeys.includes(k)));

    // Nếu cart rỗng hoàn toàn → clear selection
    if (cartKeys.length === 0) {
      setSelectedKeys([]);
      prevKeysRef.current = cartKeys;
      return;
    }

    if (newKeys.length === 0 && removedSet.size === 0) return;

    setSelectedKeys((prev) => {
      const kept = prev.filter((k) => !removedSet.has(k));
      const toAdd = newKeys.filter((k) => !kept.includes(k));
      return [...kept, ...toAdd];
    });

    prevKeysRef.current = cartKeys;
  }, [cartKeys]);

  const allSelected = useMemo(
    () =>
      lines.length > 0 && lines.every((m) => selectedKeys.includes(m._key)),
    [lines, selectedKeys]
  );

  const selectedLines = useMemo(
    () => lines.filter((m) => selectedKeys.includes(m._key)),
    [lines, selectedKeys]
  );

  const total = useMemo(
    () =>
      selectedLines.reduce(
        (s, m) => s + (Number(m.price) || 0) * (Number(m.qty) || 0),
        0
      ),
    [selectedLines]
  );

  const totalQty = useMemo(
    () => selectedLines.reduce((s, m) => s + (Number(m.qty) || 0), 0),
    [selectedLines]
  );

  const toggleItem = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (allSelected) setSelectedKeys([]);
    else setSelectedKeys(lines.map((m) => m._key));
  };

  const updateQty = (key, delta) => {
    const item = cart[key];
    if (!item) return;

    const maxQty = getMaxQty(item);
    const currentQty = Number(item.qty) || 1;

    if (delta > 0 && currentQty >= maxQty) {
      toast(
        `${t("cart.onlyLeftPrefix")} ${maxQty} ${t("cart.onlyLeftSuffix")}`,
        "error"
      );
      return;
    }

    const newQty = Math.max(1, Math.min(maxQty, currentQty + delta));
    if (newQty === currentQty) return;

    setCart((c) => ({ ...c, [key]: { ...c[key], qty: newQty } }));
  };

  const removeItem = (key) => {
    const item = cart[key];
    if (!item) return;
    setConfirmRemove({ key, name: item.name });
  };

  const executeRemove = () => {
    if (!confirmRemove) return;
    const { key } = confirmRemove;

    setCart((c) => {
      const n = { ...c };
      delete n[key];
      return n;
    });
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
    setConfirmRemove(null);
  };

  const goCheckout = () => {
    if (!selectedLines.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
    } catch {}
    navigate("/customer/checkout");
  };

  // Early return: giỏ rỗng
  if (!lines.length) {
    return (
      <div
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 16,
          padding: 80,
          textAlign: "center",
          border: "1px solid var(--border-color, #e7ebf0)",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(38, 52, 213, 0.1), rgba(32, 199, 121, 0.1))",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <ShoppingCart size={56} style={{ color: "#2634d5" }} />
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            color: "var(--text-primary, #172033)",
            fontSize: 22,
          }}
        >
          {t("cart.empty")}
        </h2>
        <p style={{ color: "var(--text-muted, #8993a3)", marginBottom: 24 }}>
          {t("cart.emptyDesc")}
        </p>
        <Link
          to="/customer/menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#2634d5",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <Store size={16} /> {t("cart.exploreMenu")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        className="cart-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e7ebf0)",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span
                role="checkbox"
                aria-checked={allSelected}
                aria-label={t("cart.selectAllAria")}
                tabIndex={0}
                onClick={toggleAll}
                onKeyDown={(e) =>
                  (e.key === " " || e.key === "Enter") && toggleAll()
                }
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: allSelected
                    ? "0"
                    : "2px solid var(--border-color, #cbd5e1)",
                  background: allSelected ? "#2634d5" : "transparent",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {allSelected && <Check size={14} color="#fff" />}
              </span>
              <b
                style={{ fontSize: 14, color: "var(--text-primary, #172033)" }}
              >
                {t("cart.selectAll")} ({lines.length} {t("cart.items")})
              </b>
            </label>

            <span style={{ fontSize: 13, color: "var(--text-muted, #64748b)" }}>
              {t("cart.selectedCount")}{" "}
              <b style={{ color: "#2634d5" }}>{selectedLines.length}</b>/
              {lines.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lines.map((m) => {
              const checked = selectedKeys.includes(m._key);
              const maxQty = getMaxQty(m);
              const atMax = m.qty >= maxQty;
              const atMin = m.qty <= 1;

              return (
                <div
                  key={m._key}
                  className="cart-item-grid"
                  style={{
                    background: "var(--card-bg, #fff)",
                    border: checked
                      ? "1.5px solid #2634d5"
                      : "1px solid var(--border-color, #e7ebf0)",
                    borderRadius: 14,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "auto 70px 1fr auto auto auto auto",
                    gap: 14,
                    alignItems: "center",
                    opacity: checked ? 1 : 0.65,
                    transition: "all 0.2s",
                    boxShadow: checked
                      ? "0 4px 12px rgba(38, 52, 213, 0.08)"
                      : "none",
                  }}
                >
                  <span
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`${t("cart.selectItemPrefix")} ${m.name}`}
                    tabIndex={0}
                    onClick={() => toggleItem(m._key)}
                    onKeyDown={(e) =>
                      (e.key === " " || e.key === "Enter") && toggleItem(m._key)
                    }
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: checked
                        ? "0"
                        : "2px solid var(--border-color, #cbd5e1)",
                      background: checked ? "#2634d5" : "transparent",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {checked && <Check size={14} color="#fff" />}
                  </span>

                  <img
                    src={m.image}
                    alt={m.name}
                    onClick={() => toggleItem(m._key)}
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 12,
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                  />

                  <div
                    style={{ minWidth: 0, cursor: "pointer" }}
                    onClick={() => toggleItem(m._key)}
                  >
                    <b
                      style={{
                        fontSize: 14,
                        color: "var(--text-primary, #172033)",
                        display: "block",
                        marginBottom: 4,
                        lineHeight: 1.35,
                      }}
                    >
                      {m.name}
                    </b>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-light, #8993a3)",
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        {t("cart.unitPrice")}:{" "}
                        <b style={{ color: "#18a967" }}>{money(m.price)}</b>
                      </span>
                      {typeof m.stock === "number" && (
                        <span style={{ color: m.stock === 0 ? "#ef4444" : undefined }}>
                          {t("cart.remaining")}: {m.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "var(--bg-tertiary, #f5f7fb)",
                      borderRadius: 24,
                      padding: 3,
                      gap: 2,
                    }}
                  >
                    <button
                      onClick={() => updateQty(m._key, -1)}
                      disabled={atMin}
                      aria-label={t("cart.decreaseQty")}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: 0,
                        background: atMin ? "transparent" : "#fff",
                        cursor: atMin ? "not-allowed" : "pointer",
                        display: "grid",
                        placeItems: "center",
                        color: atMin ? "#cbd5e1" : "#2634d5",
                        opacity: atMin ? 0.4 : 1,
                        boxShadow: atMin
                          ? "none"
                          : "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <b
                      style={{
                        minWidth: 28,
                        textAlign: "center",
                        fontSize: 14,
                        color: "#172033",
                      }}
                    >
                      {m.qty}
                    </b>
                    <button
                      onClick={() => updateQty(m._key, 1)}
                      disabled={atMax}
                      aria-label={t("cart.increaseQty")}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: 0,
                        background: atMax ? "transparent" : "#2634d5",
                        cursor: atMax ? "not-allowed" : "pointer",
                        display: "grid",
                        placeItems: "center",
                        color: atMax ? "#cbd5e1" : "#fff",
                        opacity: atMax ? 0.4 : 1,
                        boxShadow: atMax
                          ? "none"
                          : "0 1px 3px rgba(38, 52, 213, 0.3)",
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <b
                      style={{
                        fontSize: 15,
                        color: "#2634d5",
                        fontWeight: 800,
                      }}
                    >
                      {money(m.price * m.qty)}
                    </b>
                  </div>

                  <button
                    onClick={() => setEditingItem({ key: m._key, item: m })}
                    title={t("cart.editTitle")}
                    aria-label={`${t("cart.editItemPrefix")} ${m.name}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid #2634d5",
                      background: "rgba(38, 52, 213, 0.08)",
                      cursor: "pointer",
                      color: "#2634d5",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => removeItem(m._key)}
                    title={t("cart.removeTitleBtn")}
                    aria-label={`${t("cart.removeItemPrefix")} ${m.name} ${t("cart.removeItemSuffix")}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--border-color, #e5e9ef)",
                      background: "var(--card-bg, #fff)",
                      cursor: "pointer",
                      color: "#ef4444",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 14,
            padding: 20,
            position: "sticky",
            top: 90,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              color: "var(--text-primary, #172033)",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-color, #eef2f7)",
            }}
          >
            🧾 {t("checkout.summary")}
          </h3>

          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(38, 52, 213, 0.06), rgba(32, 199, 121, 0.06))",
              border: "1px dashed rgba(38, 52, 213, 0.3)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#2634d5",
                fontWeight: 700,
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {t("cart.selectedLabel")}
            </div>
            {selectedLines.length === 0 ? (
              <div
                style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}
              >
                {t("cart.noItemSelected")}
              </div>
            ) : (
              <div
                style={{ fontSize: 14, color: "var(--text-primary, #172033)" }}
              >
                <b style={{ color: "#2634d5" }}>{selectedLines.length}</b>{" "}
                {t("cart.items")} ·{" "}
                <b style={{ color: "#2634d5" }}>{totalQty}</b>{" "}
                {t("cart.parts")}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>
              {t("cart.subtotal")}
            </span>
            <b style={{ color: "var(--text-primary, #172033)" }}>
              {money(total)}
            </b>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>
              {t("cart.serviceFee")}
            </span>
            <b style={{ color: "var(--text-primary, #172033)" }}>{money(0)}</b>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 0",
              marginTop: 8,
              borderTop: "2px solid var(--border-color, #eef2f7)",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary, #172033)",
              }}
            >
              {t("cart.total")}
            </span>
            <strong style={{ color: "#2634d5", fontSize: 24, fontWeight: 800 }}>
              {money(total)}
            </strong>
          </div>

          <button
            onClick={goCheckout}
            disabled={!selectedLines.length}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: selectedLines.length
                ? "linear-gradient(135deg, #2634d5, #3b4bef)"
                : "#94a3b8",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: selectedLines.length ? "pointer" : "not-allowed",
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: selectedLines.length
                ? "0 4px 12px rgba(38, 52, 213, 0.3)"
                : "none",
            }}
          >
            {selectedLines.length ? (
              <>
                {t("cart.checkout")} <ArrowRight size={16} />
              </>
            ) : (
              t("cart.selectToOrder")
            )}
          </button>
        </div>

        {editingItem && (
          <FoodDetailModal
            item={editingItem.item}
            cart={cart}
            setCart={setCart}
            editingKey={editingItem.key}
            initialToppings={editingItem.item._toppings || []}
            initialSize={editingItem.item._size || "S"}
            initialQty={editingItem.item.qty}
            onUpdate={(oldKey, newKey, newItem) => {
              setCart((cc) => {
                const n = { ...cc };
                delete n[oldKey];
                n[newKey] = newItem;
                return n;
              });
              setSelectedKeys((prev) =>
                prev.includes(oldKey)
                  ? [...prev.filter((k) => k !== oldKey), newKey]
                  : prev
              );
            }}
            onClose={() => setEditingItem(null)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title={t("cart.removeTitle")}
        message={
          confirmRemove
            ? `"${confirmRemove.name}" ${t("cart.removeMsgSuffix")}`
            : ""
        }
        confirmText={t("cart.removeConfirm")}
        cancelText={t("cart.removeCancel")}
        danger
        onConfirm={executeRemove}
        onClose={() => setConfirmRemove(null)}
      />
    </>
  );
}