// ============================================================
// OWNERORDERS.JSX — Trang quản lý đơn hàng cho Admin
// ============================================================
// ✅ SOURCE-TEXT I18N: dùng tiếng Việt trực tiếp qua t("...")
//    (file này chỉ wrap EmployeeOrders, không có text riêng)
//
// Admin và Employee dùng CHUNG component EmployeeOrders:
//   - Admin: URL /owner/orders
//   - Employee: URL /employee/orders
//
// Cả 2 đều cần khả năng xử lý đơn hàng giống nhau (xác nhận,
// chuyển trạng thái, in hóa đơn, hủy đơn).
//
// Nếu sau này Admin cần tính năng riêng (VD: bulk action,
// filter nâng cao, export báo cáo), tách thành component riêng
// hoặc truyền prop `role="ADMIN"` xuống EmployeeOrders.
// ============================================================

import EmployeeOrders from "../employee/EmployeeOrders";

/**
 * OwnerOrders — Wrapper cho EmployeeOrders (dùng chung UI)
 *
 * Có thể truyền props xuống EmployeeOrders nếu cần:
 *   <EmployeeOrders role="ADMIN" />
 */
export default function OwnerOrders() {
  return <EmployeeOrders />;
}