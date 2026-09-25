// ============================================================
// APP.JSX — Root component + Routing
// ============================================================
// Cấu trúc:
//   1. Imports (tách rõ theo nhóm: auth, customer, employee, owner)
//   2. State: user (từ JWT), cart (persist localStorage), loading
//   3. Effects: auto-login, refresh-user, cart persistence, role redirect
//   4. Handlers: login, logout
//   5. Render:
//        - Nếu chưa login → chỉ hiện Login/Register/Forgot
//        - Nếu đã login → routes theo role + Layout
// ============================================================

import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

// ---------- Core ----------
import Layout from "./components/Layout";
import CardHoverEffect from "./components/CardHoverEffect";
import { api, setToken, getToken } from "./api";
import { toast } from "./components/Effects";

// ---------- Auth pages ----------
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import PaymentResult from "./pages/PaymentResult";
import StaffProfile from "./pages/StaffProfile";

// ---------- Customer pages ----------
import CustomerHome from "./pages/customer/CustomerHome";
import CustomerMenu from "./pages/customer/CustomerMenu";
import CustomerCart from "./pages/customer/CustomerCart";
import CustomerCheckout from "./pages/customer/CustomerCheckout";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerPoints from "./pages/customer/CustomerPoints";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerPromotions from "./pages/customer/CustomerPromotions";
import CustomerSignature from "./pages/customer/CustomerSignature";
import CustomerSuccess from "./pages/customer/CustomerSuccess";
import CustomerWallet from "./pages/customer/CustomerWallet";
import CustomerChat from "./pages/customer/CustomerChat";

// ---------- Employee pages ----------
import EmployeeHome from "./pages/employee/EmployeeHome";
import EmployeeCheckInOut from "./pages/employee/EmployeeCheckInOut";
import EmployeeOrders from "./pages/employee/EmployeeOrders";
import EmployeeMenu from "./pages/employee/EmployeeMenu";
import EmployeeChat from "./pages/employee/EmployeeChat";

// ---------- Owner (Admin) pages ----------
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerEmployees from "./pages/owner/OwnerEmployees";
import OwnerAttendance from "./pages/owner/OwnerAttendance";
import OwnerCustomers from "./pages/owner/OwnerCustomers";
import OwnerMenu from "./pages/owner/OwnerMenu";
import OwnerPriceHistory from "./pages/owner/OwnerPriceHistory";
import OwnerInventory from "./pages/owner/OwnerInventory";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerPermissions from "./pages/owner/OwnerPermissions";
import OwnerBackup from "./pages/owner/OwnerBackup";
import OwnerWallet from "./pages/owner/OwnerWallet";
import OwnerVouchers from "./pages/owner/OwnerVouchers";
import OwnerShifts from "./pages/owner/OwnerShifts";
import OwnerOrders from "./pages/owner/OwnerOrders";
import OwnerFinance from "./pages/owner/OwnerFinance";
import OwnerSettings from "./pages/owner/OwnerSettings";

// ============================================================
// APP COMPONENT
// ============================================================

export default function App() {
  // ---------- State ----------
  const [user, setUser] = useState(null);

  // Cart persist vào localStorage — key "canteen_cart"
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("canteen_cart");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // ---------- Effects ----------

  // 1. Tự động lưu cart vào localStorage mỗi khi đổi
  useEffect(() => {
    try {
      localStorage.setItem("canteen_cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
    } catch {}
  }, [cart]);

  // 2. Auto-login: nếu có token → lấy info user từ API
  useEffect(() => {
    if (getToken()) {
      api
        .me()
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 3. Lắng nghe event "refresh-user" để cập nhật user info
  //    (được phát từ các component sau khi update profile)
  useEffect(() => {
    const handler = () => {
      if (getToken()) {
        api.me().then(setUser).catch(() => {});
      }
    };
    window.addEventListener("refresh-user", handler);
    return () => window.removeEventListener("refresh-user", handler);
  }, []);

  // 4. Redirect nếu user đang ở path không khớp với role
  //    VD: ADMIN vào /customer → tự chuyển sang /owner
  useEffect(() => {
    if (!user) return;
    const rolePrefix =
      user.role === "ADMIN"
        ? "/owner"
        : user.role === "EMPLOYEE"
        ? "/employee"
        : "/customer";
    const path = location.pathname;
    if (!path.startsWith(rolePrefix)) {
      navigate(rolePrefix, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // ---------- Handlers ----------

  const handleLogin = async (email, password) => {
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setUser(res.user);

      const home =
        res.user.role === "ADMIN"
          ? "/owner"
          : res.user.role === "EMPLOYEE"
          ? "/employee"
          : "/customer";
      navigate(home);
      toast("Xin chào " + res.user.name + "!", "success");
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleLogout = () => {
  setToken(null);
  setUser(null);
  setCart({});
  localStorage.removeItem("canteen_cart");

  // ✅ Force clean body state — tránh scroll lock/class còn sót
  // từ ConfirmDialog / Sidebar mobile / ChatBot chưa kịp cleanup
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  document.documentElement.style.overflow = "";
  document.body.classList.remove("has-bottom-nav");
  document.body.classList.remove("mobile-open");

  navigate("/");
};
  // ---------- Render: Loading ----------
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Đang tải...
      </div>
    );
  }

  // ============================================================
  // CHƯA ĐĂNG NHẬP — Chỉ hiện Login/Register/Forgot
  // ============================================================
  if (!user) {
    return (
      <>
        <CardHoverEffect />
        <Routes>
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </>
    );
  }

  // ============================================================
  // HELPER — wrap page trong Layout (dùng cho đa số route)
  // ============================================================
  const wrap = (title, subtitle, node) => (
    <Layout
      role={user.role}
      title={title}
      subtitle={subtitle}
      onLogout={handleLogout}
      user={user}
    >
      {node}
    </Layout>
  );

  // ============================================================
  // ĐÃ ĐĂNG NHẬP — Routes theo role
  // ============================================================
  return (
    <>
      <CardHoverEffect />
      <Routes>

        {/* ==================== CUSTOMER ==================== */}

        {/* Trang chủ — không tiêu đề, có footer */}
        <Route
          path="/customer"
          element={
            <Layout
              role={user.role}
              title=""
              subtitle=""
              onLogout={handleLogout}
              user={user}
              hideHeading
              showFooter
            >
              <CustomerHome user={user} cart={cart} setCart={setCart} />
            </Layout>
          }
        />

        {/* Thực đơn — không tiêu đề (tự có heading riêng) */}
        <Route
          path="/customer/menu"
          element={
            <Layout
              role={user.role}
              title=""
              subtitle=""
              onLogout={handleLogout}
              user={user}
              hideHeading
            >
              <CustomerMenu cart={cart} setCart={setCart} user={user} />
            </Layout>
          }
        />

        {/* Giỏ hàng */}
        <Route
          path="/customer/cart"
          element={wrap(
            "Giỏ hàng",
            "Món bạn đã chọn",
            <CustomerCart cart={cart} setCart={setCart} />
          )}
        />

        {/* Thanh toán */}
        <Route
          path="/customer/checkout"
          element={wrap(
            "Thanh toán",
            "Hoàn tất đơn hàng",
            <CustomerCheckout cart={cart} setCart={setCart} user={user} />
          )}
        />

        {/* Điểm tích lũy → chuyển sang promotions (đã gộp tính năng) */}
        <Route
          path="/customer/points"
          element={<Navigate to="/customer/promotions" replace />}
        />

        {/* Đơn hàng */}
        <Route
          path="/customer/orders"
          element={wrap(
            "Đơn hàng",
            "Lịch sử đơn hàng",
            <CustomerOrders user={user} />
          )}
        />

        {/* Hồ sơ */}
        <Route
          path="/customer/profile"
          element={wrap(
            "Hồ sơ cá nhân",
            "Thông tin tài khoản",
            <CustomerProfile user={user} setUser={setUser} />
          )}
        />

        {/* Khuyến mãi */}
        <Route
          path="/customer/promotions"
          element={wrap(
            "Khuyến mãi",
            "Ưu đãi dành cho bạn",
            <CustomerPromotions />
          )}
        />

        {/* Ví Canteen */}
        <Route
          path="/customer/wallet"
          element={wrap(
            "Ví Canteen",
            "Nạp tiền & thanh toán nhanh",
            <CustomerWallet user={user} />
          )}
        />

        {/* Chat hỗ trợ */}
        <Route
          path="/customer/chat"
          element={wrap(
            "Chat hỗ trợ",
            "Nhắn tin với Canteen",
            <CustomerChat user={user} cart={cart} setCart={setCart} />
          )}
        />

        {/* Món Signature */}
        <Route
          path="/customer/signature"
          element={wrap(
            "Món Signature",
            "Đặc sản Canteen VWA",
            <CustomerSignature />
          )}
        />

        {/* Đặt hàng thành công */}
        <Route
          path="/customer/success"
          element={wrap(
            "Đặt hàng thành công",
            "Cảm ơn bạn!",
            <CustomerSuccess />
          )}
        />

        {/* Kết quả thanh toán */}
        <Route
          path="/customer/payment-result"
          element={wrap(
            "Kết quả thanh toán",
            "",
            <PaymentResult />
          )}
        />

        {/* ==================== EMPLOYEE ==================== */}

        {/* Trang chủ nhân viên */}
        <Route
          path="/employee"
          element={
            <Layout
              role={user.role}
              title=""
              subtitle=""
              onLogout={handleLogout}
              user={user}
              hideHeading
            >
              <EmployeeHome />
            </Layout>
          }
        />

        {/* Chấm công */}
        <Route
          path="/employee/attendance"
          element={wrap(
            "Chấm công",
            "Check-in / Check-out",
            <EmployeeCheckInOut />
          )}
        />

        {/* Đơn hàng */}
        <Route
          path="/employee/orders"
          element={wrap(
            "Đơn hàng",
            "Xử lý đơn khách",
            <EmployeeOrders />
          )}
        />

        {/* Thực đơn */}
        <Route
          path="/employee/menu"
          element={wrap(
            "Thực đơn",
            "Xem tình trạng món",
            <EmployeeMenu />
          )}
        />

        {/* Hồ sơ (không sửa email) */}
        <Route
          path="/employee/profile"
          element={wrap(
            "Hồ sơ cá nhân",
            "Thông tin tài khoản",
            <StaffProfile user={user} setUser={setUser} canEditEmail={false} />
          )}
        />

        {/* Chat khách */}
        <Route
          path="/employee/chat"
          element={wrap(
            "Chat khách hàng",
            "Hỗ trợ khách hàng",
            <EmployeeChat />
          )}
        />

        {/* ==================== OWNER (ADMIN) ==================== */}

        {/* Tổng quan */}
        <Route
          path="/owner"
          element={wrap(
            "Tổng quan",
            "Theo dõi hoạt động Canteen",
            <OwnerDashboard />
          )}
        />

        {/* Quản lý nhân viên */}
        <Route
          path="/owner/employees"
          element={wrap(
            "Quản lý nhân viên",
            "Danh sách nhân viên",
            <OwnerEmployees />
          )}
        />

        {/* Quản lý ca */}
        <Route
          path="/owner/shifts"
          element={wrap(
            "Quản lý ca",
            "Phân ca + theo dõi chấm công",
            <OwnerShifts />
          )}
        />

        {/* Chấm công */}
        <Route
          path="/owner/attendance"
          element={wrap(
            "Chấm công",
            "Lịch sử chấm công nhân viên",
            <OwnerAttendance />
          )}
        />

        {/* Quản lý khách hàng */}
        <Route
          path="/owner/customers"
          element={wrap(
            "Quản lý khách hàng",
            "Danh sách khách hàng",
            <OwnerCustomers />
          )}
        />

        {/* Quản lý thực đơn */}
        <Route
          path="/owner/menu"
          element={wrap(
            "Quản lý thực đơn",
            "Món ăn",
            <OwnerMenu />
          )}
        />

        {/* Lịch sử giá */}
        <Route
          path="/owner/price-history"
          element={wrap(
            "Lịch sử giá",
            "Theo dõi thay đổi giá món ăn",
            <OwnerPriceHistory />
          )}
        />

        {/* Kho hàng */}
        <Route
          path="/owner/inventory"
          element={wrap(
            "Kho hàng",
            "Nguyên liệu",
            <OwnerInventory />
          )}
        />

        {/* Báo cáo */}
        <Route
          path="/owner/reports"
          element={wrap(
            "Báo cáo",
            "Doanh thu & thống kê",
            <OwnerReports />
          )}
        />

        {/* Phân quyền */}
        <Route
          path="/owner/permissions"
          element={wrap(
            "Phân quyền",
            "Phân quyền chi tiết cho từng user",
            <OwnerPermissions />
          )}
        />

        {/* Đơn hàng (dùng chung component với Employee) */}
        <Route
          path="/owner/orders"
          element={wrap(
            "Quản lý đơn hàng",
            "Xử lý đơn khách như nhân viên",
            <OwnerOrders />
          )}
        />

        {/* Voucher */}
        <Route
          path="/owner/vouchers"
          element={wrap(
            "Quản lý Voucher",
            "Tạo / sửa / xóa voucher cho khách",
            <OwnerVouchers />
          )}
        />

        {/* Tài chính */}
        <Route
          path="/owner/finance"
          element={wrap(
            "Quản lý tài chính",
            "Tài khoản nhận tiền, doanh thu, chi phí",
            <OwnerFinance />
          )}
        />

        {/* Ví Canteen (admin) */}
        <Route
          path="/owner/wallet"
          element={wrap(
            "Quản lý Ví Canteen",
            "Duyệt nạp / rút / thanh toán của khách",
            <OwnerWallet />
          )}
        />

        {/* Cài đặt */}
        <Route
          path="/owner/settings"
          element={wrap(
            "Cài đặt",
            "Tài khoản nhận tiền + thông tin liên hệ",
            <OwnerSettings />
          )}
        />

        {/* Hồ sơ (được sửa email) */}
        <Route
          path="/owner/profile"
          element={wrap(
            "Hồ sơ cá nhân",
            "Thông tin tài khoản",
            <StaffProfile user={user} setUser={setUser} canEditEmail={true} />
          )}
        />

        {/* Backup dữ liệu */}
        <Route
          path="/owner/backup"
          element={wrap(
            "Backup dữ liệu",
            "Xuất / nhập / reset database",
            <OwnerBackup />
          )}
        />

        {/* ==================== FALLBACK ==================== */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                user.role === "ADMIN"
                  ? "/owner"
                  : user.role === "EMPLOYEE"
                  ? "/employee"
                  : "/customer"
              }
            />
          }
        />
      </Routes>
    </>
  );
}