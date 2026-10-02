// ============================================================
// CUSTOMERWALLET.JSX — Ví Canteen (khách hàng)
// ============================================================
// ✅ SOURCE-TEXT I18N: dùng tiếng Việt trực tiếp qua t("...")
//    Không còn key cũ kiểu "wallet.xxx" / "common.xxx"
// ============================================================

import { Skeleton, SkeletonList, SkeletonStats } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Wallet, Plus, Minus, Link as LinkIcon, CreditCard, QrCode, Banknote,
  Clock, CheckCircle2, ArrowDownCircle, ArrowUpCircle, ShoppingBag,
  X, Building2, History, AlertTriangle, Loader2, AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import { useI18n } from "../../hooks/useI18n";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;

const BANKS = [
  { code: "VCB",  name: "Vietcombank" },
  { code: "TCB",  name: "Techcombank" },
  { code: "VIB",  name: "VIB" },
  { code: "MBB",  name: "MB Bank" },
  { code: "ACB",  name: "ACB" },
  { code: "TPB",  name: "TPBank" },
  { code: "VPB",  name: "VPBank" },
  { code: "STB",  name: "Sacombank" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB",  name: "Vietinbank" },
  { code: "AGB",  name: "Agribank" },
];

const MIN_DEPOSIT = 10000;
const MIN_WITHDRAW = 20000;

const QUICK_DEPOSIT = [50000, 100000, 200000, 500000, 1000000, 2000000];
const QUICK_WITHDRAW = [50000, 100000, 200000];

const EMPTY_WALLET = {
  balance: 0,
  bank_name: "",
  bank_account: "",
  bank_account_name: "",
  linked_at: "",
};

// ============================================================
// HELPERS
// ============================================================

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerWallet() {
  const { t } = useI18n();

  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("all");

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showLinkBank, setShowLinkBank] = useState(false);

  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // ---------- TX config (source-text) ----------
  const TX_CONFIG = useMemo(
    () => ({
      deposit:  { icon: ArrowDownCircle, color: "#18a967", bg: "#e8f9f1", label: t("Nạp tiền"),    sign: "+" },
      withdraw: { icon: ArrowUpCircle,   color: "#f59e0b", bg: "#fef3c7", label: t("Rút tiền"),    sign: "−" },
      payment:  { icon: ShoppingBag,     color: "#8b5cf6", bg: "#ede9fe", label: t("Thanh toán"),  sign: "−" },
    }),
    [t]
  );

  const STATUS_CONFIG = useMemo(
    () => ({
      pending:  { label: t("Chờ duyệt"), color: "#f59e0b", bg: "#fef3c7" },
      approved: { label: t("Thành công"), color: "#18a967", bg: "#e8f9f1" },
      rejected: { label: t("Từ chối"),    color: "#ef4444", bg: "#fee2e2" },
    }),
    [t]
  );

  // ---------- Load ----------
  const loadAll = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const myReqId = ++reqIdRef.current;
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [w, txs, st] = await Promise.all([
        api.wallet.me().catch(() => null),
        api.wallet.transactions().catch(() => []),
        api.settings.get().catch(() => null),
      ]);

      if (myReqId !== reqIdRef.current) return;

      if (w) setWallet({ ...EMPTY_WALLET, ...w });
      setTransactions(Array.isArray(txs) ? txs : []);
      if (st) setSettings(st);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || t("Không tải được dữ liệu ví"));
      }
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
      inFlightRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    if (tab === "all") return transactions;
    return transactions.filter((tx) => tx.type === tab);
  }, [transactions, tab]);

  const stats = useMemo(() => {
    let deposited = 0;
    let withdrawn = 0;
    let paid = 0;
    let pending = 0;

    for (const tx of transactions) {
      if (tx.status === "pending") pending++;
      if (tx.status !== "approved") continue;

      const amt = Number(tx.amount) || 0;
      if (tx.type === "deposit") deposited += amt;
      else if (tx.type === "withdraw") withdrawn += amt;
      else if (tx.type === "payment") paid += amt;
    }
    return { deposited, withdrawn, paid, pending };
  }, [transactions]);

  const isLinked = !!wallet.bank_account;
  const canWithdraw = isLinked && wallet.balance >= MIN_WITHDRAW;

  const handleSuccessModal = useCallback(async () => {
    setShowDeposit(false);
    setShowWithdraw(false);
    setShowLinkBank(false);
    await loadAll(true);
  }, [loadAll]);

  // ---------- Tabs config (source-text) ----------
  const TABS = [
    { id: "all",      label: t("Tất cả") },
    { id: "deposit",  label: t("Nạp tiền") },
    { id: "withdraw", label: t("Rút tiền") },
    { id: "payment",  label: t("Thanh toán") },
  ];

  return (
    <div>
      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => loadAll(false)}
            style={{
              padding: "6px 12px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <RefreshCw size={12} /> {t("Thử lại")}
          </button>
        </div>
      )}

      {/* HERO: SỐ DƯ */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #2634d5 0%, #8b5cf6 50%, #18a967 100%)",
          borderRadius: 18,
          padding: "28px 32px",
          marginBottom: 20,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -20,
            fontSize: 140,
            opacity: 0.12,
          }}
        >
          💳
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              opacity: 0.9,
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            <Wallet size={14} /> {t("Ví Canteen")}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>
            {t("Số dư khả dụng")}
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {loading ? (
              <Loader2
                size={36}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              money(wallet.balance || 0)
            )}
          </div>

          <div
            className="wallet-hero-btns"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <button
              onClick={() => setShowDeposit(true)}
              style={{
                padding: "11px 20px",
                background: "#fff",
                color: "#2634d5",
                border: 0,
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={16} /> {t("Nạp tiền")}
            </button>

            <button
              onClick={() => canWithdraw && setShowWithdraw(true)}
              disabled={!canWithdraw}
              title={
                !isLinked
                  ? t("Vui lòng liên kết ngân hàng trước")
                  : wallet.balance < MIN_WITHDRAW
                  ? t("Số dư tối thiểu {value} để rút").replace("{value}", money(MIN_WITHDRAW))
                  : t("Rút tiền về tài khoản đã liên kết")
              }
              style={{
                padding: "11px 20px",
                background: canWithdraw
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.15)",
                color: canWithdraw ? "#fff" : "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: canWithdraw ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Minus size={16} /> {t("Rút tiền")}
            </button>

            <button
              onClick={() => setShowLinkBank(true)}
              style={{
                padding: "11px 20px",
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <LinkIcon size={16} />{" "}
              {isLinked ? t("Đổi ngân hàng") : t("Liên kết ngân hàng")}
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      {loading ? (
        <div style={{ marginBottom: 20 }}>
          <SkeletonStats count={4} columns="repeat(4, 1fr)" />
        </div>
      ) : (
        <div
          className="wallet-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatBox
            icon={<ArrowDownCircle size={18} />}
            label={t("Đã nạp")}
            value={money(stats.deposited)}
            color="#18a967"
          />
          <StatBox
            icon={<ArrowUpCircle size={18} />}
            label={t("Đã rút")}
            value={money(stats.withdrawn)}
            color="#f59e0b"
          />
          <StatBox
            icon={<ShoppingBag size={18} />}
            label={t("Đã thanh toán")}
            value={money(stats.paid)}
            color="#8b5cf6"
          />
          <StatBox
            icon={<Clock size={18} />}
            label={t("Chờ duyệt")}
            value={stats.pending}
            color="#ef4444"
          />
        </div>
      )}

      {/* LINKED BANK INFO */}
      {isLinked && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(24, 169, 103, 0.08), rgba(38, 52, 213, 0.05))",
            border: "1px solid rgba(24, 169, 103, 0.3)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#e8f9f1",
              color: "#18a967",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                fontWeight: 600,
                marginBottom: 2,
                textTransform: "uppercase",
              }}
            >
              {t("Ngân hàng đã liên kết")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                fontSize: 13,
              }}
            >
              <span>
                <b>{wallet.bank_name}</b>
              </span>
              <span style={{ fontFamily: "monospace" }}>
                {wallet.bank_account}
              </span>
              <span style={{ color: "var(--text-muted, #64748b)" }}>
                {wallet.bank_account_name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--text-primary, #172033)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <History size={18} /> {t("Lịch sử giao dịch")}
          </h3>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-tertiary, #f5f7fb)",
                padding: 4,
                borderRadius: 10,
              }}
            >
              {TABS.map((tItem) => (
                <button
                  key={tItem.id}
                  onClick={() => setTab(tItem.id)}
                  style={{
                    padding: "7px 14px",
                    background:
                      tab === tItem.id ? "#2634d5" : "transparent",
                    color:
                      tab === tItem.id
                        ? "#fff"
                        : "var(--text-muted, #475569)",
                    border: 0,
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tItem.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadAll(false)}
              disabled={refreshing}
              title={t("Làm mới")}
              aria-label={t("Làm mới")}
              style={{
                padding: "6px 12px",
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 6,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: 12,
                color: "var(--text-primary, #172033)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <Loader2
                  size={12}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonList key={i} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 10,
            }}
          >
            <Wallet size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 13 }}>
              {tab === "all"
                ? t("Chưa có giao dịch nào")
                : t("Không có giao dịch {type}").replace(
                    "{type}",
                    TABS.find((x) => x.id === tab)?.label || ""
                  )}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                TX_CONFIG={TX_CONFIG}
                STATUS_CONFIG={STATUS_CONFIG}
                methodLabels={{
                  QR: t("VietQR"),
                  CASH: t("Tiền mặt"),
                  BANK: t("Chuyển khoản"),
                  WALLET: t("Ví Canteen"),
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showDeposit && (
        <DepositModal
          settings={settings}
          onClose={() => setShowDeposit(false)}
          onSuccess={handleSuccessModal}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          balance={wallet.balance}
          bank={{
            name: wallet.bank_name,
            account: wallet.bank_account,
            accountName: wallet.bank_account_name,
          }}
          onClose={() => setShowWithdraw(false)}
          onSuccess={handleSuccessModal}
        />
      )}
      {showLinkBank && (
        <LinkBankModal
          wallet={wallet}
          onClose={() => setShowLinkBank(false)}
          onSuccess={handleSuccessModal}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .wallet-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB: TransactionRow
// ============================================================

function TransactionRow({ tx, TX_CONFIG, STATUS_CONFIG, methodLabels }) {
  const config = TX_CONFIG[tx.type] || {
    icon: Wallet,
    color: "#2634d5",
    bg: "#eef2ff",
    label: "—",
    sign: "",
  };
  const statusCfg = STATUS_CONFIG[tx.status] || {
    label: "—",
    color: "#64748b",
    bg: "#f1f5f9",
  };
  const Icon = config.icon;

  const methodLabel = methodLabels[tx.method];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        background: "var(--bg-tertiary, #f8fafc)",
        borderRadius: 10,
        border: "1px solid var(--border-color, #eef2f7)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: config.bg,
          color: config.color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
            flexWrap: "wrap",
          }}
        >
          <b style={{ fontSize: 13, color: "var(--text-primary, #172033)" }}>
            {config.label}
          </b>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              background: statusCfg.bg,
              color: statusCfg.color,
            }}
          >
            {statusCfg.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-light, #8993a3)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: "monospace" }}>{tx.code || "—"}</span>
          {methodLabel && <span>· {methodLabel}</span>}
          <span>· {fmtDateTime(tx.created_at)}</span>
        </div>
        {tx.admin_note && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted, #64748b)",
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Admin: "{tx.admin_note}"
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <b style={{ fontSize: 15, color: config.color }}>
          {config.sign}
          {money(tx.amount || 0)}
        </b>
      </div>
    </div>
  );
}

// ============================================================
// SUB: StatBox
// ============================================================

function StatBox({ icon, label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: color + "18",
            color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-light, #8993a3)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

// ============================================================
// MODAL WRAPPER
// ============================================================

function Modal({ children, onClose, busy = false, maxWidth = 460, label }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, onClose]);

  return (
    <div
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
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
// DEPOSIT MODAL
// ============================================================

function DepositModal({ settings, onClose, onSuccess }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(100000);
  const [method, setMethod] = useState("QR");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tx, setTx] = useState(null);

  const busy = submitting;

  const submit = async () => {
    if (submitting) return;
    if (amount < MIN_DEPOSIT) {
      toast(
        t("Số tiền nạp tối thiểu {value}").replace("{value}", money(MIN_DEPOSIT)),
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.wallet.deposit({ amount, method, note });
      setTx(res.transaction);
      toast(t("Đã tạo yêu cầu nạp tiền"), "success");

      if (method === "CASH") {
        onSuccess();
      } else {
        setStep(2);
      }
    } catch (e) {
      toast(e.message || t("Không tạo được yêu cầu nạp"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- STEP 2: QR ----------
  if (step === 2 && tx && method === "QR") {
    const bankCode = settings?.bank || "VCB";
    const bankAccount = settings?.account || "";
    const bankName = settings?.accountName || "CANTEEN VWA";

    const qrUrl = bankAccount
      ? `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${tx.amount}&addInfo=${encodeURIComponent(tx.code)}&accountName=${encodeURIComponent(bankName)}`
      : null;

    return (
      <Modal onClose={onClose} busy={busy} label={t("Nạp tiền qua VietQR")}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#eef2ff",
              color: "#2634d5",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
            }}
          >
            <QrCode size={28} />
          </div>
          <h3 style={{ margin: "0 0 6px", color: "var(--text-primary, #172033)" }}>
            {t("Nạp tiền qua VietQR")}
          </h3>
          <p
            style={{
              margin: 0,
              color: "var(--text-muted, #64748b)",
              fontSize: 13,
            }}
          >
            {t("Quét mã QR để chuyển {amount} cho đơn {code}")
              .replace("{amount}", money(tx.amount))
              .replace("{code}", tx.code)}
          </p>
        </div>

        {qrUrl ? (
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              marginBottom: 16,
              border: "1px solid var(--border-color, #e5e9ef)",
            }}
          >
            <img
              src={qrUrl}
              alt="QR"
              style={{ width: 240, height: 240 }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "block";
              }}
            />
            <div
              style={{
                display: "none",
                color: "var(--text-muted, #64748b)",
                fontSize: 13,
                textAlign: "center",
                padding: 20,
              }}
            >
              {t("Không tải được mã QR")}
              <br />
              <b>
                {bankCode} · {bankAccount}
              </b>
              <br />
              {t("Nội dung chuyển khoản")}: <b>{tx.code}</b>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#fff4d8",
              border: "1px solid #f59e0b40",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              fontSize: 13,
              color: "#92400e",
              textAlign: "center",
            }}
          >
            {t("Chưa cấu hình tài khoản nhận tiền")}
          </div>
        )}

        <div
          style={{
            background: "#fff4d8",
            border: "1px solid #f59e0b40",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
            fontSize: 12,
            color: "#92400e",
            display: "flex",
            gap: 8,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {t("Vui lòng chuyển đúng số tiền và nội dung. Yêu cầu sẽ được admin duyệt trong vài phút.")}
          </span>
        </div>

        <button
          onClick={onSuccess}
          style={{
            width: "100%",
            padding: 12,
            background: "#2634d5",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t("Đã hiểu")}
        </button>
      </Modal>
    );
  }

  // ---------- STEP 1: form ----------
  return (
    <Modal onClose={onClose} busy={busy} label={t("Nạp tiền")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "var(--text-primary, #172033)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={20} style={{ color: "#18a967" }} /> {t("Nạp tiền")}
        </h3>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label={t("Đóng")}
          style={closeBtnStyle(busy)}
        >
          <X size={20} />
        </button>
      </div>

      <label style={labelStyle}>{t("Số tiền")} *</label>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          min={MIN_DEPOSIT}
          step={1000}
          disabled={busy}
          style={{
            ...inputStyle,
            paddingRight: 50,
            fontSize: 18,
            fontWeight: 700,
            color: "#18a967",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-light, #94a3b8)",
            fontWeight: 600,
          }}
        >
          đ
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          marginBottom: 16,
        }}
      >
        {QUICK_DEPOSIT.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmount(a)}
            disabled={busy}
            style={quickBtnStyle(amount === a, "#2634d5", busy)}
          >
            {a.toLocaleString("vi-VN")}đ
          </button>
        ))}
      </div>

      <label style={labelStyle}>{t("Phương thức")}</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          {
            id: "QR",
            icon: QrCode,
            label: t("VietQR"),
            desc: "VietQR",
            color: "#2634d5",
          },
          {
            id: "CASH",
            icon: Banknote,
            label: t("Tiền mặt"),
            desc: t("Nộp tại quầy"),
            color: "#18a967",
          },
        ].map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              disabled={busy}
              style={{
                padding: 14,
                background: active ? m.color + "15" : "var(--card-bg, #fff)",
                border: active
                  ? `2px solid ${m.color}`
                  : "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 10,
                cursor: busy ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Icon
                size={22}
                style={{
                  color: active ? m.color : "var(--text-light, #94a3b8)",
                }}
              />
              <b
                style={{
                  fontSize: 12,
                  color: active ? m.color : "var(--text-primary, #475569)",
                }}
              >
                {m.label}
              </b>
              <span style={{ fontSize: 10, color: "var(--text-light, #94a3b8)" }}>
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>

      <label style={labelStyle}>{t("Ghi chú")}</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("Ghi chú thêm (không bắt buộc)")}
        maxLength={200}
        disabled={busy}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={btnCancelStyle(busy)}
        >
          {t("Hủy")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || amount < MIN_DEPOSIT}
          style={btnPrimaryStyle(busy || amount < MIN_DEPOSIT, "#18a967")}
        >
          {submitting ? (
            <>
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
              {t("Đang xử lý...")}
            </>
          ) : (
            `${t("Nạp tiền")} ${amount.toLocaleString("vi-VN")}đ`
          )}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// WITHDRAW MODAL
// ============================================================

function WithdrawModal({ balance, bank, onClose, onSuccess }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(50000);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting;

  const submit = async () => {
    if (submitting) return;

    if (amount < MIN_WITHDRAW) {
      toast(
        t("Số tiền rút tối thiểu {value}").replace("{value}", money(MIN_WITHDRAW)),
        "error"
      );
      return;
    }
    if (amount > balance) {
      toast(t("Số dư không đủ"), "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.wallet.withdraw({ amount, note });
      toast(t("Đã gửi yêu cầu rút tiền"), "success");
      onSuccess();
    } catch (e) {
      toast(e.message || t("Không gửi được yêu cầu rút"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} busy={busy} label={t("Rút tiền")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "var(--text-primary, #172033)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Minus size={20} style={{ color: "#f59e0b" }} /> {t("Rút tiền")}
        </h3>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label={t("Đóng")}
          style={closeBtnStyle(busy)}
        >
          <X size={20} />
        </button>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #fef3c7, #fff4d8)",
          border: "1px solid #f59e0b40",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          fontSize: 12,
          color: "#92400e",
        }}
      >
        <div>
          <b>{t("Số dư khả dụng")}:</b> {money(balance)}
        </div>
      </div>

      <label style={labelStyle}>{t("Số tiền")} *</label>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          min={MIN_WITHDRAW}
          max={balance}
          step={1000}
          disabled={busy}
          style={{
            ...inputStyle,
            paddingRight: 50,
            fontSize: 18,
            fontWeight: 700,
            color: "#f59e0b",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-light, #94a3b8)",
            fontWeight: 600,
          }}
        >
          đ
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {QUICK_WITHDRAW.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmount(a)}
            disabled={busy || a > balance}
            style={quickBtnStyle(amount === a, "#f59e0b", busy || a > balance)}
          >
            {a.toLocaleString("vi-VN")}đ
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAmount(balance)}
        disabled={busy}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 14,
          background: "var(--bg-tertiary, #f5f7fb)",
          border: "1px dashed var(--border-color, #cbd5e1)",
          borderRadius: 8,
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted, #64748b)",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {t("Rút toàn bộ")} {money(balance)}
      </button>

      <label style={labelStyle}>{t("Tài khoản nhận tiền")}</label>
      <div
        style={{
          background: "var(--bg-tertiary, #f5f7fb)",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          fontSize: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Building2 size={14} style={{ color: "#2634d5" }} />
          <b>{bank.name}</b>
        </div>
        <div
          style={{
            fontFamily: "monospace",
            color: "var(--text-muted, #64748b)",
            wordBreak: "break-all",
          }}
        >
          {bank.account} · {bank.accountName}
        </div>
      </div>

      <label style={labelStyle}>{t("Ghi chú")}</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("Ghi chú thêm (không bắt buộc)")}
        maxLength={200}
        disabled={busy}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={btnCancelStyle(busy)}
        >
          {t("Hủy")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || amount < MIN_WITHDRAW || amount > balance}
          style={btnPrimaryStyle(
            busy || amount < MIN_WITHDRAW || amount > balance,
            "#f59e0b"
          )}
        >
          {submitting ? (
            <>
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
              {t("Đang xử lý...")}
            </>
          ) : (
            t("Gửi yêu cầu rút tiền")
          )}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// LINK BANK MODAL
// ============================================================

function LinkBankModal({ wallet, onClose, onSuccess }) {
  const { t } = useI18n();
  const [bankName, setBankName] = useState(wallet.bank_name || "VCB");
  const [account, setAccount] = useState(wallet.bank_account || "");
  const [accountName, setAccountName] = useState(wallet.bank_account_name || "");
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting;

  const submit = async () => {
    if (submitting) return;

    if (!account.trim() || account.trim().length < 6) {
      toast(t("Số tài khoản không hợp lệ"), "error");
      return;
    }
    if (!accountName.trim()) {
      toast(t("Vui lòng nhập tên chủ tài khoản"), "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.wallet.linkBank({
        bank_name: bankName,
        bank_account: account.trim(),
        bank_account_name: accountName.trim().toUpperCase(),
      });
      toast(t("Đã liên kết ngân hàng"), "success");
      onSuccess();
    } catch (e) {
      toast(e.message || t("Không liên kết được ngân hàng"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} busy={busy} label={t("Liên kết ngân hàng")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "var(--text-primary, #172033)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CreditCard size={20} style={{ color: "#2634d5" }} /> {t("Liên kết ngân hàng")}
        </h3>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label={t("Đóng")}
          style={closeBtnStyle(busy)}
        >
          <X size={20} />
        </button>
      </div>

      <div
        style={{
          background: "#eef2ff",
          border: "1px solid #2634d540",
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          fontSize: 12,
          color: "#2634d5",
          display: "flex",
          gap: 8,
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {t("Tài khoản này sẽ dùng để nhận tiền khi bạn rút từ Ví Canteen. Hãy kiểm tra kỹ trước khi lưu.")}
        </span>
      </div>

      <label style={labelStyle}>{t("Ngân hàng")} *</label>
      <select
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        disabled={busy}
        style={inputStyle}
      >
        {BANKS.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name} ({b.code})
          </option>
        ))}
      </select>

      <label style={labelStyle}>{t("Số tài khoản")} *</label>
      <input
        value={account}
        onChange={(e) => setAccount(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="1234567890"
        inputMode="numeric"
        maxLength={20}
        disabled={busy}
        style={{ ...inputStyle, fontFamily: "monospace" }}
      />

      <label style={labelStyle}>{t("Tên chủ tài khoản")} *</label>
      <input
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        onBlur={() => setAccountName((s) => s.toUpperCase().trim())}
        placeholder="NGUYEN VAN A"
        maxLength={100}
        disabled={busy}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={btnCancelStyle(busy)}
        >
          {t("Hủy")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={
            busy || !account.trim() || !accountName.trim() || account.length < 6
          }
          style={btnPrimaryStyle(
            busy || !account.trim() || !accountName.trim() || account.length < 6,
            "#2634d5"
          )}
        >
          {submitting ? (
            <>
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
              {t("Đang lưu...")}
            </>
          ) : (
            t("Lưu tài khoản")
          )}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// STYLE HELPERS
// ============================================================

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

const closeBtnStyle = (disabled) => ({
  background: "transparent",
  border: 0,
  cursor: disabled ? "not-allowed" : "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 4,
  display: "grid",
  placeItems: "center",
  opacity: disabled ? 0.5 : 1,
});

const btnCancelStyle = (disabled) => ({
  flex: 1,
  padding: 12,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  background: "var(--card-bg, #fff)",
  cursor: disabled ? "not-allowed" : "pointer",
  color: "var(--text-primary, #172033)",
  fontWeight: 600,
  fontSize: 13,
  opacity: disabled ? 0.6 : 1,
});

const btnPrimaryStyle = (disabled, color = "#2634d5") => ({
  flex: 1,
  padding: 12,
  background: disabled ? "#94a3b8" : color,
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
});

const quickBtnStyle = (active, color, disabled) => ({
  padding: "8px 4px",
  background: active ? color : "var(--bg-tertiary, #f5f7fb)",
  color: active ? "#fff" : "var(--text-primary, #172033)",
  border: `1px solid ${active ? color : "var(--border-color, #e5e9ef)"}`,
  borderRadius: 7,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 11,
  fontWeight: 700,
  opacity: disabled ? 0.4 : 1,
});