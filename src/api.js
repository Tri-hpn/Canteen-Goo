// ============================================================
// API.JS — HTTP client cho Backend Express
// ============================================================
// - BASE: tự động lấy từ .env hoặc fallback "/api"
// - Token: lưu trong sessionStorage (mất khi đóng tab)
// - req(): wrapper fetch với error handling
// - api.*: các endpoint chia theo nhóm chức năng
//
// Cách dùng:
//   import { api } from "./api";
//   const user = await api.me();
//   const orders = await api.orders.myOrders();
// ============================================================

const BASE = import.meta.env.VITE_API_URL || "/api";

// ============================================================
// TOKEN HELPERS
// ============================================================

export function getToken() {
  return sessionStorage.getItem("token");
}

export function setToken(t) {
  if (t) sessionStorage.setItem("token", t);
  else sessionStorage.removeItem("token");
}

// ============================================================
// FETCH WRAPPER
// ============================================================

async function req(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ============================================================
// API ENDPOINTS
// ============================================================

export const api = {
  // Base URL hiện tại (dùng để debug)
  _base: BASE,

  // ----------------------------------------------------------
  // AUTH — Xác thực & tài khoản cá nhân
  // ----------------------------------------------------------
  login: (email, password) =>
    req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data) =>
    req("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => req("/auth/me"),

  updateProfile: (data) =>
    req("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  changePassword: (data) =>
    req("/auth/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // ----------------------------------------------------------
  // STATS — Dashboard tổng quan
  // ----------------------------------------------------------
  stats: () => req("/stats"),

  // ----------------------------------------------------------
  // MENU — Thực đơn
  // ----------------------------------------------------------
  menu: {
    list: (q = "", category = "Tất cả", sort = "popular", all = false) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category && category !== "Tất cả") params.set("category", category);
      if (sort) params.set("sort", sort);
      if (all) params.set("all", "1");
      const qs = params.toString();
      return req("/menu" + (qs ? "?" + qs : ""));
    },
    get:    (id)          => req(`/menu/${id}`),
    create: (data)        => req("/menu",       { method: "POST",   body: JSON.stringify(data) }),
    update: (id, data)    => req(`/menu/${id}`, { method: "PUT",    body: JSON.stringify(data) }),
    remove: (id)          => req(`/menu/${id}`, { method: "DELETE" }),
  },

  // ----------------------------------------------------------
  // PRICE HISTORY — Lịch sử đổi giá
  // ----------------------------------------------------------
  priceHistory: {
    list: (menuItemId) =>
      req("/price-history" + (menuItemId ? "?menu_item_id=" + menuItemId : "")),
  },

  // ----------------------------------------------------------
  // ORDERS — Đơn hàng
  // ----------------------------------------------------------
  orders: {
    create:    (data)        => req("/orders",              { method: "POST",  body: JSON.stringify(data) }),
    myOrders:  ()            => req("/orders/me"),
    all: (status = "Tất cả") => {
      // Chỉ gửi status khi khác "Tất cả" — backend hiểu
      // không có param = lấy hết
      const qs =
        status && status !== "Tất cả"
          ? `?status=${encodeURIComponent(status)}`
          : "";
      return req("/orders" + qs);
    },
    setStatus: (id, status)  => req(`/orders/${id}`,        { method: "PATCH", body: JSON.stringify({ status }) }),
    received:  (id)          => req(`/orders/${id}/received`, { method: "POST" }),
    cancel:    (id)          => req(`/orders/${id}/cancel`,   { method: "POST" }),
  },

  // ----------------------------------------------------------
  // USERS — Quản lý người dùng (chỉ ADMIN)
  // ----------------------------------------------------------
  users: {
    list:   (role)        => req(`/users${role ? `?role=${role}` : ""}`),
    create: (data)        => req("/users",       { method: "POST",   body: JSON.stringify(data) }),
    update: (id, data)    => req(`/users/${id}`, { method: "PUT",    body: JSON.stringify(data) }),
    remove: (id)          => req(`/users/${id}`, { method: "DELETE" }),
  },

  // ----------------------------------------------------------
  // INVENTORY — Kho hàng
  // ----------------------------------------------------------
  inventory: {
    list:    ()              => req("/inventory"),
    create:  (data)          => req("/inventory",                { method: "POST",   body: JSON.stringify(data) }),
    update:  (code, data)    => req(`/inventory/${code}`,         { method: "PUT",    body: JSON.stringify(data) }),
    remove:  (code)          => req(`/inventory/${code}`,         { method: "DELETE" }),
    import:  (code, data)    => req(`/inventory/${code}/import`,  { method: "POST",   body: JSON.stringify(data) }),
    imports: ()              => req("/inventory/imports"),
  },

  // ----------------------------------------------------------
  // ATTENDANCE — Chấm công
  // ----------------------------------------------------------
  attendance: {
    today:     ()        => req("/attendance/today"),
    me:        ()        => req("/attendance/me"),
    checkIn:   (data)    => req("/attendance/checkin",  { method: "POST", body: JSON.stringify(data || {}) }),
    checkOut:  (data)    => req("/attendance/checkout", { method: "POST", body: JSON.stringify(data || {}) }),
    all:       (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return req("/attendance" + (q ? `?${q}` : ""));
    },
    employees: ()        => req("/attendance/employees"),
  },

  // ----------------------------------------------------------
  // SHIFTS — Quản lý ca làm việc
  // ----------------------------------------------------------
  shifts: {
    mine:     ()             => req("/shifts/me"),
    pending:  ()             => req("/shifts/pending"),
    all:      (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return req("/shifts" + (q ? `?${q}` : ""));
    },
    register: (data)         => req("/shifts/register", { method: "POST", body: JSON.stringify(data) }),
    bulk:     (data)         => req("/shifts/bulk",     { method: "POST", body: JSON.stringify(data) }),
    create:   (data)         => req("/shifts",          { method: "POST", body: JSON.stringify(data) }),
    update:   (id, data)     => req(`/shifts/${id}`,    { method: "PUT",  body: JSON.stringify(data) }),
    remove:   (id)           => req(`/shifts/${id}`,    { method: "DELETE" }),
    approve:  (id)           => req(`/shifts/${id}/approve`, { method: "PATCH"  }),
    reject:   (id)           => req(`/shifts/${id}/reject`,  { method: "DELETE" }),
  },

  // ----------------------------------------------------------
  // WALLET — Ví Canteen
  // ----------------------------------------------------------
  wallet: {
    me:           ()            => req("/wallet/me"),
    transactions: ()            => req("/wallet/transactions"),
    deposit:      (data)        => req("/wallet/deposit",   { method: "POST", body: JSON.stringify(data) }),
    withdraw:     (data)        => req("/wallet/withdraw",  { method: "POST", body: JSON.stringify(data) }),
    linkBank:     (data)        => req("/wallet/link-bank", { method: "POST", body: JSON.stringify(data) }),
    pay:          (data)        => req("/wallet/pay",       { method: "POST", body: JSON.stringify(data) }),

    // Admin only
    requests:     (status)      => req("/wallet/requests" + (status ? "?status=" + status : "")),
    all:          ()            => req("/wallet/all"),
    stats:        ()            => req("/wallet/stats"),
    approve:      (id, note)    => req(`/wallet/requests/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ admin_note: note || "" }),
    }),
    reject:       (id, note)    => req(`/wallet/requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ admin_note: note || "" }),
    }),
  },

  // ----------------------------------------------------------
  // REVIEWS — Đánh giá món ăn
  // ----------------------------------------------------------
  reviews: {
    me:        ()            => req("/reviews/me"),
    list:      (menuItemId)  => req(`/reviews/${menuItemId}`),
    create:    (data)        => req("/reviews", { method: "POST", body: JSON.stringify(data) }),
    canReview: (menuItemId)  => req(`/reviews/can-review/${menuItemId}`),
  },

  // ----------------------------------------------------------
  // POINTS — Điểm tích lũy
  // ----------------------------------------------------------
  points: {
    me:     ()      => req("/points/me"),
    redeem: (data)  => req("/points/redeem", { method: "POST", body: JSON.stringify(data) }),
  },

  // ----------------------------------------------------------
  // VOUCHERS — Khuyến mãi (khách hàng)
  // ----------------------------------------------------------
  vouchers: {
    me:       ()      => req("/vouchers/me"),
    public:   ()      => req("/vouchers/public"),
    validate: (code)  => req("/vouchers/validate", { method: "POST", body: JSON.stringify({ code }) }),
    claim:    (id)    => req(`/vouchers/claim/${id}`, { method: "POST" }),

    // Admin only
    all:      ()          => req("/vouchers"),
    create:   (data)      => req("/vouchers",       { method: "POST",   body: JSON.stringify(data) }),
    update:   (id, data)  => req(`/vouchers/${id}`, { method: "PUT",    body: JSON.stringify(data) }),
    remove:   (id)        => req(`/vouchers/${id}`, { method: "DELETE" }),

    // Admin voucher extras
    stats:    ()          => req("/vouchers/stats"),
    claims:   (templateId) => req(`/vouchers/claims/${templateId}`),
    ofUser:   (userId)    => req(`/vouchers/user/${userId}`),
    revoke:   (id)        => req(`/vouchers/revoke/${id}`, { method: "DELETE" }),
  },

  // ----------------------------------------------------------
  // NOTIFICATIONS — Thông báo
  // ----------------------------------------------------------
  notifications: {
    list:    ()      => req("/notifications"),
    read:    (id)    => req(`/notifications/${id}/read`, { method: "POST" }),
    readAll: ()      => req("/notifications/read-all",   { method: "POST" }),
  },

  // ----------------------------------------------------------
  // CHAT — Tin nhắn khách hàng ↔ nhân viên
  // ----------------------------------------------------------
  chat: {
    myMessages:    ()       => req("/chat/me"),
    conversations: ()       => req("/chat/conversations"),
    messagesWith:  (userId) => req(`/chat/with/${userId}`),
    send:          (data)   => req("/chat/send", { method: "POST", body: JSON.stringify(data) }),
  },

  // ----------------------------------------------------------
  // CATALOG — Topping / Size / Category
  // ----------------------------------------------------------
  toppings: {
    list: (category) =>
      req(`/toppings${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  },

  sizes: {
    list: () => req("/sizes"),
  },

  categories: {
    list:   ()          => req("/categories"),
    create: (data)      => req("/categories",       { method: "POST",   body: JSON.stringify(data) }),
    update: (id, data)  => req(`/categories/${id}`, { method: "PUT",    body: JSON.stringify(data) }),
    remove: (id)        => req(`/categories/${id}`, { method: "DELETE" }),
  },

  // ----------------------------------------------------------
  // PROMOTIONS — Món đang giảm giá (public)
  // ----------------------------------------------------------
  promotions: {
    list: () => req("/promotions"),
  },

  // ----------------------------------------------------------
  // PERMISSIONS — Phân quyền chi tiết
  // ----------------------------------------------------------
  permissions: {
    all:    ()              => req("/permissions"),
    me:     ()              => req("/permissions/me"),
    ofUser: (userId)        => req(`/permissions/${userId}`),
    update: (userId, custom) =>
      req(`/permissions/${userId}`, { method: "PUT", body: JSON.stringify({ custom }) }),
  },

  // ----------------------------------------------------------
  // BACKUP — Sao lưu / phục hồi database
  // ----------------------------------------------------------
  backup: {
    export: ()        => req("/backup/export"),
    import: (data)    => req("/backup/import", { method: "POST", body: JSON.stringify(data) }),
    reset:  (confirm) => req("/backup/reset",  { method: "POST", body: JSON.stringify({ confirm }) }),
    stats:  ()        => req("/backup/stats"),
  },

  // ----------------------------------------------------------
  // REPORTS — Báo cáo doanh thu
  // ----------------------------------------------------------
  reports: {
    revenue: (period = "day") => req(`/reports/revenue?period=${period}`),
  },
// src/api.js — trong object api.shifts
shifts: {
  mine:     () => req("/shifts/me"),
  pending:  () => req("/shifts/pending"),
  all:      (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("/shifts" + (q ? `?${q}` : ""));
  },
  register: (data) => req("/shifts/register", { method: "POST", body: JSON.stringify(data) }),
  bulk:     (data) => req("/shifts/bulk",     { method: "POST", body: JSON.stringify(data) }),
  create:   (data) => req("/shifts",          { method: "POST", body: JSON.stringify(data) }),
  update:   (id, data) => req(`/shifts/${id}`,    { method: "PUT",  body: JSON.stringify(data) }),
  remove:   (id)       => req(`/shifts/${id}`,    { method: "DELETE" }),
  approve:  (id)       => req(`/shifts/${id}/approve`, { method: "PATCH"  }),
  reject:   (id)       => req(`/shifts/${id}/reject`,  { method: "DELETE" }),
},
  // ----------------------------------------------------------
  // SETTINGS — Cài đặt hệ thống (bank, hotline, ...)
  // ----------------------------------------------------------
  settings: {
    get:    ()      => req("/settings"),
    update: (data)  => req("/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
};
