// ============================================================
// ĐA NGÔN NGỮ — i18n.js
// ============================================================
// Hỗ trợ 2 ngôn ngữ: Tiếng Việt (vi) + English (en)
//
// Cách dùng:
//   import { useTranslation } from "../i18n";
//   const { t, lang, setLang } = useTranslation();
//   t("common.save")  // → "Lưu" hoặc "Save"
//
// Đổi ngôn ngữ:
//   setLang("en")  // Lưu vào localStorage + phát event
// ============================================================

import { useEffect, useState } from "react";

// ============================================================
// BẢNG DỊCH — VI + EN
// ============================================================
// Quy ước key:
//   common.*     — Dùng chung toàn app
//   nav.*        — Menu sidebar
//   role.*       — Vai trò người dùng
//   status.*     — Trạng thái đơn / user / tồn kho
//   login.*      — Trang đăng nhập
//   dashboard.*  — Trang dashboard chủ
//   customer.*   — Trang khách hàng
//   cart.*       — Giỏ hàng
//   checkout.*   — Thanh toán
//   menu.*       — Trang thực đơn
//   orders.*     — Đơn hàng
//   profile.*    — Hồ sơ
//   points.*     — Điểm tích lũy
//   chat.*       — Chat
//   owner.*      — Trang chủ
//   employee.*   — Trang nhân viên
//   chart.*      — Biểu đồ
//   lang.*       — Chọn ngôn ngữ
//   promo.*      — Khuyến mãi (legacy)
//   wallet.*     — Ví Canteen
//   theme.*      — Chế độ sáng/tối
// ============================================================

export const translations = {
  vi: {
    // ---------- Common (dùng chung) ----------
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.delete": "Xóa",
    "common.edit": "Sửa",
    "common.add": "Thêm",
    "common.search": "Tìm kiếm",
    "common.close": "Đóng",
    "common.confirm": "Xác nhận",
    "common.loading": "Đang tải...",
    "common.success": "Thành công",
    "common.error": "Lỗi",
    "common.logout": "Đăng xuất",
    "common.login": "Đăng nhập",
    "common.register": "Đăng ký",
    "common.view": "Xem",
    "common.update": "Cập nhật",
    "common.refresh": "Làm mới",
    "common.total": "Tổng",
    "common.status": "Trạng thái",
    "common.action": "Thao tác",
    "common.all": "Tất cả",
    "common.yes": "Có",
    "common.no": "Không",
    "common.quantity": "Số lượng",
    "common.price": "Giá",
    "common.name": "Tên",
    "common.email": "Email",
    "common.phone": "Số điện thoại",
    "common.date": "Ngày",
    "common.time": "Thời gian",

    // ---------- Sidebar (menu điều hướng) ----------
    "nav.dashboard": "Tổng quan",
    "nav.home": "Trang chủ",
    "nav.menu": "Thực đơn",
    "nav.cart": "Giỏ hàng",
    "nav.orders": "Đơn hàng",
    "nav.points": "Điểm tích lũy",
    "nav.chat": "Chat hỗ trợ",
    "nav.profile": "Hồ sơ",
    "nav.employees": "Quản lý nhân viên",
    "nav.customers": "Quản lý khách hàng",
    "nav.inventory": "Kho hàng",
    "nav.reports": "Báo cáo",
    "nav.attendance": "Chấm công",
    "nav.shifts": "Quản lý ca",
    "nav.backup": "Backup dữ liệu",
    "nav.settings": "Cài đặt",
    "nav.finance": "Quản lý tài chính",
    "nav.vouchers": "Quản lý Voucher",
    "nav.promotions": "Khuyến mãi",
    "nav.wallet": "Ví Canteen",
    "nav.wallet_admin": "Ví Canteen",
    "nav.price": "Lịch sử giá",
    "nav.permissions": "Phân quyền",
    "nav.process": "Chấm công",
    "nav.chat_staff": "Chat khách",
    "nav.notifications": "Thông báo",
    "nav.more": "Thêm",

    // ---------- Roles (vai trò) ----------
    "role.admin": "Quản trị viên",
    "role.employee": "Nhân viên",
    "role.customer": "Khách hàng",

    // ---------- Status (trạng thái) ----------
    "status.pending": "Chờ xác nhận",
    "status.confirmed": "Đã xác nhận",
    "status.preparing": "Đang chuẩn bị",
    "status.ready": "Sẵn sàng nhận",
    "status.done": "Hoàn thành",
    "status.cancelled": "Đã hủy",
    "status.active": "Hoạt động",
    "status.locked": "Bị khóa",
    "status.onTime": "Đúng giờ",
    "status.late": "Đi muộn",
    "status.early": "Về sớm",
    "status.available": "Còn hàng",
    "status.lowStock": "Sắp hết",
    "status.outOfStock": "Hết hàng",

    // ---------- Login (đăng nhập) ----------
    "login.title": "Đăng nhập",
    "login.subtitle": "Truy cập hệ thống Canteen VWA",
    "login.email": "Email / Tên đăng nhập",
    "login.password": "Mật khẩu",
    "login.remember": "Ghi nhớ đăng nhập",
    "login.forgot": "Quên mật khẩu?",
    "login.noAccount": "Chưa có tài khoản?",
    "login.registerNow": "Đăng ký ngay",
    "login.demoAccounts": "Tài khoản demo",
    "login.welcome": "Quản lý Canteen đơn giản & hiệu quả.",
    "login.description": "Hệ thống đặt món và quản lý Canteen VWA dành cho khách hàng, nhân viên và quản trị viên.",
    "login.users": "Nhóm người dùng",
    "login.dishes": "Món ăn mẫu",
    "login.tracking": "Theo dõi đơn",

    // ---------- Dashboard (chủ canteen) ----------
    "dashboard.revenue": "Doanh thu hôm nay",
    "dashboard.orders": "Đơn hàng",
    "dashboard.customers": "Khách hàng",
    "dashboard.lowStock": "Sắp hết hàng",
    "dashboard.revenue7": "Doanh thu 7 ngày",
    "dashboard.orderStatus": "Trạng thái đơn",
    "dashboard.topItems": "Top 5 món bán chạy",
    "dashboard.newOrders": "Đơn hàng mới nhất",
    "dashboard.todayOverview": "Theo dõi hoạt động Canteen",
    "dashboard.welcome": "Chào mừng Chủ Canteen",
    "dashboard.ordersToday": "Đơn hôm nay",
    "dashboard.pending": "Chờ xử lý",
    "dashboard.preparing": "Đang làm",
    "dashboard.done": "Hoàn thành",
    "dashboard.needAction": "Cần nhập",
    "dashboard.units": "nghìn đồng",
    "dashboard.staffOnline": "Đang làm",
    "dashboard.realTime": "Realtime",
    "dashboard.vsYesterday": "so với hôm qua",
    "dashboard.vsLastMonth": "so với tháng trước",

    // ---------- Customer home (trang chủ khách) ----------
    "customer.greeting": "Xin chào",
    "customer.hello": "Chào buổi sáng",
    "customer.whatToEat": "hôm nay ăn gì?",
    "customer.subtitle": "Đặt món nhanh chóng, thanh toán tiện lợi.",
    "customer.viewMenu": "Xem thực đơn",
    "customer.bestSeller": "Bán chạy nhất",
    "customer.newDishes": "Mới lên kệ",
    "customer.quickOrder": "Đặt món nhanh",
    "customer.waitTime": "Thời gian chờ",
    "customer.minutes": "phút",
    "customer.serving": "Món đang phục vụ",
    "customer.studentDiscount": "Ưu đãi sinh viên",

    // ---------- Cart (giỏ hàng) ----------
    "cart.title": "Giỏ hàng",
    "cart.empty": "Giỏ hàng đang trống",
    "cart.emptyDesc": "Hãy chọn món ăn bạn yêu thích.",
    "cart.exploreMenu": "Khám phá thực đơn",
    "cart.selectedItems": "Món đã chọn",
    "cart.items": "món",
    "cart.subtotal": "Tạm tính",
    "cart.serviceFee": "Phí dịch vụ",
    "cart.total": "Tổng cộng",
    "cart.checkout": "Tiến hành đặt hàng",

    // ---------- Checkout (thanh toán) ----------
    "checkout.title": "Thanh toán",
    "checkout.subtitle": "Hoàn tất đơn hàng",
    "checkout.recipient": "Người đặt",
    "checkout.phone": "Số điện thoại",
    "checkout.place": "Vị trí nhận hàng",
    "checkout.placeHolder": "-- Chọn vị trí nhận hàng --",
    "checkout.note": "Ghi chú",
    "checkout.notePlaceholder": "Ví dụ: ít cay, không hành...",
    "checkout.summary": "Tóm tắt đơn",
    "checkout.voucher": "Mã voucher",
    "checkout.apply": "Áp dụng",
    "checkout.discount": "Giảm giá",
    "checkout.payment": "Hình thức thanh toán",
    "checkout.cash": "Tiền mặt",
    "checkout.cashDesc": "Trả tiền khi nhận món",
    "checkout.qr": "QR Code",
    "checkout.qrDesc": "Quét VietQR / MoMo",
    "checkout.card": "Quẹt thẻ",
    "checkout.cardDesc": "Visa, Master, ATM",
    "checkout.placeOrder": "Đặt hàng",
    "checkout.selectPlace": "Vui lòng chọn vị trí nhận hàng",
    "checkout.enterName": "Vui lòng nhập tên người đặt",
    "checkout.enterPhone": "Vui lòng nhập số điện thoại",
    "checkout.invalidPhone": "Số điện thoại không hợp lệ",
    "checkout.pointsEarn": "Nhận điểm khi đặt hàng",
    "checkout.checkInfo": "Vui lòng kiểm tra lại thông tin",

    // ✅ Bổ sung cho CustomerCheckout
    "checkout.nameLabel": "Họ và tên",
    "checkout.namePlaceholder": "Nguyễn Văn A",
    "checkout.phoneLabel": "Số điện thoại",
    "checkout.phonePlaceholder": "0901234567",
    "checkout.pickupLabel": "Giờ nhận hàng",
    "checkout.selectTime": "-- Chọn khung giờ nhận --",
    "checkout.timePast": "(đã qua)",
    "checkout.nameRequired": "Vui lòng nhập họ tên",
    "checkout.phoneRequired": "Vui lòng nhập số điện thoại",
    "checkout.phoneInvalid": "SĐT phải 10-11 chữ số",
    "checkout.timeRequired": "Vui lòng chọn giờ nhận hàng",
    "checkout.timePastErr": "Khung giờ này đã qua, vui lòng chọn giờ khác",
    "checkout.cartEmpty": "Giỏ hàng trống, không thể đặt hàng",
    "checkout.notePickupPrefix": "Nhận lúc",
    "checkout.orderSuccessMsg": "Đặt hàng thành công!",
    "checkout.orderErrorMsg": "Không tạo được đơn hàng",
    "checkout.voucherPlaceholder": "Nhập mã voucher",
    "checkout.voucherRequired": "Vui lòng nhập mã voucher",
    "checkout.voucherAppliedMsg": "Áp dụng voucher thành công",
    "checkout.voucherError": "Mã voucher không hợp lệ",
    "checkout.checking": "Đang kiểm tra...",
    "checkout.applied": "Đã áp dụng",
    "checkout.yourVouchers": "Ví voucher của bạn",
    "checkout.usePointsPrefix": "Đổi từ",
    "checkout.usePointsSuffix": "điểm",
    "checkout.adminGift": "Quà tặng từ admin",
    "checkout.pointsBannerPrefix": "Bạn có",
    "checkout.pointsBannerMiddle": "điểm · Đổi ngay voucher",
    "checkout.redeemBtnPrefix": "Đổi",
    "checkout.redeemBtnMiddle": "điểm → voucher",
    "checkout.redeemNeedMsg": "Cần ít nhất 100 điểm để đổi voucher",
    "checkout.redeemSuccessMsg": "Đổi điểm thành công!",
    "checkout.redeemErrorMsg": "Không đổi được voucher",
    "checkout.pointsInfoPrefix": "Bạn có",
    "checkout.pointsInfoMiddle": "điểm · Cần thêm",
    "checkout.pointsInfoSuffix": "điểm để đổi voucher",
    "checkout.viewPoints": "Xem chi tiết",
    "checkout.loadingInfo": "Đang tải thông tin...",
    "checkout.orderSummary": "Tóm tắt đơn hàng",
    "checkout.subtotal": "Tạm tính",
    "checkout.orderBtn": "Đặt hàng",

    // ---------- Menu page (trang thực đơn) ----------
    "menu.title": "Thực đơn",
    "menu.subtitle": "Chọn món yêu thích",
    "menu.search": "Tìm món ăn...",
    "menu.addToCart": "Thêm",
    "menu.chooseSize": "Chọn size",
    "menu.addToppings": "Thêm topping",
    "menu.reviews": "Đánh giá",
    "menu.stock": "Còn",
    "menu.portions": "phần",
    "menu.addToCartFull": "Thêm vào giỏ",

    // ---------- Orders (đơn hàng) ----------
    "orders.title": "Đơn hàng của tôi",
    "orders.subtitle": "Lịch sử đơn hàng",
    "orders.code": "Mã đơn",
    "orders.count": "đơn",
    "orders.noOrders": "Chưa có đơn hàng",
    "orders.detail": "Chi tiết",
    "orders.orderCode": "Đơn hàng",
    "orders.orderTime": "Thời gian đặt",
    "orders.itemsOrdered": "Món đã đặt",
    "orders.receivedConfirm": "Tôi đã nhận món",
    "orders.cancelOrder": "Hủy đơn",
    "orders.close": "Đóng",
    "orders.confirmed": "Đã xác nhận nhận món?",
    "orders.cancelled": "Đã hủy đơn",
    "orders.cancelConfirm": "Bạn chắc chắn muốn hủy đơn này?",

    // ---------- Profile (hồ sơ) ----------
    "profile.title": "Hồ sơ cá nhân",
    "profile.subtitle": "Thông tin tài khoản",
    "profile.name": "Họ và tên",
    "profile.email": "Email",
    "profile.role": "Vai trò",
    "profile.phone": "Số điện thoại",
    "profile.address": "Địa chỉ",
    "profile.update": "Lưu thay đổi",
    "profile.updated": "Đã cập nhật thông tin",

    // ---------- Points (điểm tích lũy) ----------
    "points.title": "Điểm tích lũy",
    "points.subtitle": "Đổi điểm lấy voucher",
    "points.yourPoints": "Điểm tích lũy của bạn",
    "points.rate": "1 điểm = 100đ khi đổi voucher",
    "points.redeem": "Đổi điểm thành voucher",
    "points.needMin": "Cần ít nhất 100 điểm để đổi",
    "points.voucherValue": "Voucher nhận được",
    "points.redeemNow": "Đổi",
    "points.history": "Lịch sử tích lũy",
    "points.noHistory": "Chưa có giao dịch",
    "points.noEnough": "Không đủ điểm",
    "points.success": "Đổi thành công",

    // ---------- Chat ----------
    "chat.title": "Chat hỗ trợ",
    "chat.subtitle": "Trò chuyện với Canteen",
    "chat.placeholder": "Nhập tin nhắn...",
    "chat.empty": "Chưa có tin nhắn. Hãy gửi câu hỏi cho Canteen!",
    "chat.online": "Đang hoạt động",
    "chat.support": "Hỗ trợ Canteen VWA",
    "chat.customerMessages": "Tin nhắn khách hàng",
    "chat.noConversations": "Chưa có tin nhắn nào",
    "chat.selectConv": "Chọn 1 cuộc trò chuyện để bắt đầu",
    "chat.reply": "Trả lời khách hàng...",

    // ---------- Owner pages (trang chủ) ----------
    "owner.overview": "Tổng quan",
    "owner.employeesTitle": "Quản lý nhân viên",
    "owner.employeesDesc": "Danh sách nhân viên",
    "owner.addEmployee": "Thêm nhân viên",
    "owner.editEmployee": "Chỉnh sửa nhân viên",
    "owner.searchEmployee": "Tìm nhân viên...",
    "owner.attendanceTitle": "Chấm công",
    "owner.attendanceDesc": "Lịch sử chấm công nhân viên",
    "owner.customersTitle": "Quản lý khách hàng",
    "owner.customersDesc": "Danh sách khách hàng",
    "owner.searchCustomer": "Tìm theo tên, email, SĐT...",
    "owner.menuTitle": "Quản lý thực đơn",
    "owner.menuDesc": "Món ăn",
    "owner.addDish": "Thêm món",
    "owner.editDish": "Sửa món",
    "owner.searchDish": "Tìm món ăn...",
    "owner.priceHistoryTitle": "Lịch sử giá",
    "owner.priceHistoryDesc": "Theo dõi thay đổi giá món ăn",
    "owner.inventoryTitle": "Kho hàng",
    "owner.inventoryDesc": "Nguyên liệu",
    "owner.addIngredient": "Thêm nguyên liệu",
    "owner.importStock": "Nhập kho",
    "owner.importHistory": "Lịch sử nhập",
    "owner.reportsTitle": "Báo cáo",
    "owner.reportsDesc": "Doanh thu",
    "owner.permissionsTitle": "Phân quyền",
    "owner.permissionsDesc": "Phân quyền chi tiết cho từng user",
    "owner.backupTitle": "Backup dữ liệu",
    "owner.backupDesc": "Xuất / nhập / reset database",
    "owner.searchCustomerFull": "Tìm theo tên, email, SĐT...",
    "owner.exportData": "Xuất Excel",
    "owner.employeeId": "Mã NV",
    "owner.customerId": "Mã KH",
    "owner.ingredientId": "Mã",
    "owner.ingredient": "Nguyên liệu",
    "owner.minStock": "Tối thiểu",
    "owner.unit": "Đơn vị",
    "owner.totalIngredients": "Tổng nguyên liệu",
    "owner.lowStockCount": "Sắp hết",
    "owner.outOfStockCount": "Hết hàng",
    "owner.availableCount": "Đủ hàng",
    "owner.category": "Danh mục",
    "owner.description": "Mô tả",
    "owner.image": "Ảnh",
    "owner.reason": "Lý do đổi giá",

    // ---------- Employee (nhân viên) ----------
    "employee.overview": "Tổng quan nhân viên",
    "employee.welcome": "Hôm nay làm việc hiệu quả nhé!",
    "employee.checkIn": "Chấm công",
    "employee.checkInDesc": "Check-in / Check-out",
    "employee.ordersTitle": "Đơn hàng",
    "employee.ordersDesc": "Xử lý đơn khách",
    "employee.menuTitle": "Thực đơn",
    "employee.menuDesc": "Xem tình trạng món",
    "employee.chatTitle": "Chat khách hàng",
    "employee.chatDesc": "Hỗ trợ khách hàng",
    "employee.ordersToday": "Đơn hôm nay",
    "employee.pendingOrders": "Chờ xử lý",
    "employee.serving": "Món đang phục vụ",
    "employee.lowStock": "Nguyên liệu sắp hết",
    "employee.process": "Xử lý",
    "employee.confirm": "Xác nhận",
    "employee.startPrep": "Bắt đầu làm",
    "employee.readyForPickup": "Sẵn sàng nhận",
    "employee.markDone": "Hoàn thành",
    "employee.processOrder": "Đơn hàng cần xử lý",
    "employee.priority": "Ưu tiên theo thời gian đặt",
    "employee.viewAll": "Xem tất cả",

    // ---------- Chart (biểu đồ) ----------
    "chart.revenueByDay": "Doanh thu theo ngày",
    "chart.last7Days": "Triệu đồng • 7 ngày gần nhất",
    "chart.todayOrders": "Trạng thái đơn hàng hôm nay",
    "chart.orders": "đơn",
    "chart.completed": "Hoàn thành",
    "chart.processing": "Đang xử lý",
    "chart.pending": "Chờ xác nhận",
    "chart.cancelled": "Đã hủy",
    "chart.soldToday": "Món bán chạy hôm nay",
    "chart.newOrders": "Đơn hàng mới",

    // ---------- Promo (khuyến mãi / voucher) ----------
    "promo.redeeming": "Đang đổi...",
    "promo.claiming": "Đang nhận...",
    "promo.copySuccess": "Đã sao chép mã",
    "promo.claimSuccess": "Đã nhận voucher!",

    // ---------- Wallet (ví canteen) ----------
    "wallet.title": "Ví Canteen",
    "wallet.balance": "Số dư khả dụng",
    "wallet.deposit": "Nạp tiền",
    "wallet.withdraw": "Rút tiền",
    "wallet.linkBank": "Liên kết ngân hàng",
    "wallet.transactions": "Lịch sử giao dịch",
    "wallet.noTx": "Chưa có giao dịch nào",

    // ---------- Theme ----------
    "theme.toLight": "Chế độ sáng",
    "theme.toDark": "Chế độ tối",

    // ---------- Language (ngôn ngữ) ----------
    "lang.vi": "Tiếng Việt",
    "lang.en": "English",
    "lang.select": "Chọn ngôn ngữ"
  },

  en: {
    // ---------- Common ----------
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.loading": "Loading...",
    "common.success": "Success",
    "common.error": "Error",
    "common.logout": "Logout",
    "common.login": "Login",
    "common.register": "Register",
    "common.view": "View",
    "common.update": "Update",
    "common.refresh": "Refresh",
    "common.total": "Total",
    "common.status": "Status",
    "common.action": "Actions",
    "common.all": "All",
    "common.yes": "Yes",
    "common.no": "No",
    "common.quantity": "Quantity",
    "common.price": "Price",
    "common.name": "Name",
    "common.email": "Email",
    "common.phone": "Phone",
    "common.date": "Date",
    "common.time": "Time",

    // ---------- Sidebar ----------
    "nav.dashboard": "Dashboard",
    "nav.home": "Home",
    "nav.menu": "Menu",
    "nav.cart": "Cart",
    "nav.orders": "My Orders",
    "nav.points": "Points",
    "nav.chat": "Chat Support",
    "nav.profile": "Profile",
    "nav.employees": "Employees",
    "nav.customers": "Customers",
    "nav.inventory": "Inventory",
    "nav.reports": "Reports",
    "nav.attendance": "Attendance",
    "nav.shifts": "Shift Management",
    "nav.backup": "Backup Data",
    "nav.settings": "Settings",
    "nav.finance": "Finance",
    "nav.vouchers": "Vouchers",
    "nav.promotions": "Promotions",
    "nav.wallet": "Canteen Wallet",
    "nav.wallet_admin": "Canteen Wallet Admin",
    "nav.price": "Price History",
    "nav.permissions": "Permissions",
    "nav.process": "Attendance",
    "nav.chat_staff": "Customer Chat",
    "nav.notifications": "Notifications",
    "nav.more": "More",

    // ---------- Roles ----------
    "role.admin": "Administrator",
    "role.employee": "Employee",
    "role.customer": "Customer",

    // ---------- Status ----------
    "status.pending": "Pending",
    "status.confirmed": "Confirmed",
    "status.preparing": "Preparing",
    "status.ready": "Ready for pickup",
    "status.done": "Completed",
    "status.cancelled": "Cancelled",
    "status.active": "Active",
    "status.locked": "Locked",
    "status.onTime": "On time",
    "status.late": "Late",
    "status.early": "Early leave",
    "status.available": "Available",
    "status.lowStock": "Low stock",
    "status.outOfStock": "Out of stock",

    // ---------- Login ----------
    "login.title": "Login",
    "login.subtitle": "Access Canteen VWA system",
    "login.email": "Email / Username",
    "login.password": "Password",
    "login.remember": "Remember me",
    "login.forgot": "Forgot password?",
    "login.noAccount": "Don't have an account?",
    "login.registerNow": "Register now",
    "login.demoAccounts": "Demo accounts",
    "login.welcome": "Simple & effective Canteen management.",
    "login.description": "Order and manage Canteen VWA for customers, employees and admins.",
    "login.users": "User groups",
    "login.dishes": "Sample dishes",
    "login.tracking": "Order tracking",

    // ---------- Dashboard ----------
    "dashboard.revenue": "Today's revenue",
    "dashboard.orders": "Orders",
    "dashboard.customers": "Customers",
    "dashboard.lowStock": "Low stock",
    "dashboard.revenue7": "7-day revenue",
    "dashboard.orderStatus": "Order status",
    "dashboard.topItems": "Top 5 best sellers",
    "dashboard.newOrders": "Latest orders",
    "dashboard.todayOverview": "Canteen activity tracking",
    "dashboard.welcome": "Welcome Canteen Owner",
    "dashboard.ordersToday": "Today's orders",
    "dashboard.pending": "Pending",
    "dashboard.preparing": "Preparing",
    "dashboard.done": "Completed",
    "dashboard.needAction": "Need restock",
    "dashboard.units": "thousands VND",
    "dashboard.staffOnline": "Working",
    "dashboard.realTime": "Realtime",
    "dashboard.vsYesterday": "vs yesterday",
    "dashboard.vsLastMonth": "vs last month",

    // ---------- Customer home ----------
    "customer.greeting": "Hello",
    "customer.hello": "Good morning",
    "customer.whatToEat": "what to eat today?",
    "customer.subtitle": "Quick ordering, convenient payment.",
    "customer.viewMenu": "View menu",
    "customer.bestSeller": "Best sellers",
    "customer.newDishes": "New arrivals",
    "customer.quickOrder": "Quick order",
    "customer.waitTime": "Wait time",
    "customer.minutes": "minutes",
    "customer.serving": "Dishes served",
    "customer.studentDiscount": "Student discount",

    // ---------- Cart ----------
    "cart.title": "Cart",
    "cart.empty": "Your cart is empty",
    "cart.emptyDesc": "Choose your favorite dishes.",
    "cart.exploreMenu": "Explore menu",
    "cart.selectedItems": "Selected items",
    "cart.items": "items",
    "cart.subtotal": "Subtotal",
    "cart.serviceFee": "Service fee",
    "cart.total": "Total",
    "cart.checkout": "Proceed to checkout",

    // ---------- Checkout ----------
    "checkout.title": "Checkout",
    "checkout.subtitle": "Complete your order",
    "checkout.recipient": "Recipient",
    "checkout.phone": "Phone number",
    "checkout.place": "Pickup location",
    "checkout.placeHolder": "-- Select pickup location --",
    "checkout.note": "Note",
    "checkout.notePlaceholder": "E.g. less spicy, no onion...",
    "checkout.summary": "Order summary",
    "checkout.voucher": "Voucher code",
    "checkout.apply": "Apply",
    "checkout.discount": "Discount",
    "checkout.payment": "Payment method",
    "checkout.cash": "Cash",
    "checkout.cashDesc": "Pay when you receive",
    "checkout.qr": "QR Code",
    "checkout.qrDesc": "Scan VietQR / MoMo",
    "checkout.card": "Card",
    "checkout.cardDesc": "Visa, Master, ATM",
    "checkout.placeOrder": "Place order",
    "checkout.selectPlace": "Please select pickup location",
    "checkout.enterName": "Please enter recipient name",
    "checkout.enterPhone": "Please enter phone number",
    "checkout.invalidPhone": "Invalid phone number",
    "checkout.pointsEarn": "Earn points on order",
    "checkout.checkInfo": "Please check your information",

    // ✅ Added for CustomerCheckout
    "checkout.nameLabel": "Full name",
    "checkout.namePlaceholder": "John Doe",
    "checkout.phoneLabel": "Phone number",
    "checkout.phonePlaceholder": "0901234567",
    "checkout.pickupLabel": "Pickup time",
    "checkout.selectTime": "-- Select a pickup time --",
    "checkout.timePast": "(past)",
    "checkout.nameRequired": "Please enter your name",
    "checkout.phoneRequired": "Please enter your phone number",
    "checkout.phoneInvalid": "Phone must be 10-11 digits",
    "checkout.timeRequired": "Please select pickup time",
    "checkout.timePastErr": "This time slot has passed. Please choose another.",
    "checkout.cartEmpty": "Cart is empty, cannot place order",
    "checkout.notePickupPrefix": "Pickup at",
    "checkout.orderSuccessMsg": "Order placed successfully!",
    "checkout.orderErrorMsg": "Failed to create order",
    "checkout.voucherPlaceholder": "Enter voucher code",
    "checkout.voucherRequired": "Please enter voucher code",
    "checkout.voucherAppliedMsg": "Voucher applied",
    "checkout.voucherError": "Invalid voucher",
    "checkout.checking": "Checking...",
    "checkout.applied": "Applied",
    "checkout.yourVouchers": "Your vouchers",
    "checkout.usePointsPrefix": "Redeemed from",
    "checkout.usePointsSuffix": "points",
    "checkout.adminGift": "Admin gift",
    "checkout.pointsBannerPrefix": "You have",
    "checkout.pointsBannerMiddle": "points · Redeem now",
    "checkout.redeemBtnPrefix": "Redeem",
    "checkout.redeemBtnMiddle": "points → voucher",
    "checkout.redeemNeedMsg": "Need at least 100 points to redeem",
    "checkout.redeemSuccessMsg": "Redeemed successfully!",
    "checkout.redeemErrorMsg": "Failed to redeem voucher",
    "checkout.pointsInfoPrefix": "You have",
    "checkout.pointsInfoMiddle": "points · Need",
    "checkout.pointsInfoSuffix": "more to redeem",
    "checkout.viewPoints": "View details",
    "checkout.loadingInfo": "Loading info...",
    "checkout.orderSummary": "Order summary",
    "checkout.subtotal": "Subtotal",
    "checkout.orderBtn": "Place order",

    // ---------- Menu page ----------
    "menu.title": "Menu",
    "menu.subtitle": "Choose your favorite",
    "menu.search": "Search dishes...",
    "menu.addToCart": "Add",
    "menu.chooseSize": "Choose size",
    "menu.addToppings": "Add toppings",
    "menu.reviews": "Reviews",
    "menu.stock": "Left",
    "menu.portions": "portions",
    "menu.addToCartFull": "Add to cart",

    // ---------- Orders ----------
    "orders.title": "My Orders",
    "orders.subtitle": "Order history",
    "orders.code": "Order code",
    "orders.count": "orders",
    "orders.noOrders": "No orders yet",
    "orders.detail": "Detail",
    "orders.orderCode": "Order",
    "orders.orderTime": "Order time",
    "orders.itemsOrdered": "Items ordered",
    "orders.receivedConfirm": "I received my order",
    "orders.cancelOrder": "Cancel order",
    "orders.close": "Close",
    "orders.confirmed": "Confirm you received the order?",
    "orders.cancelled": "Order cancelled",
    "orders.cancelConfirm": "Are you sure to cancel this order?",

    // ---------- Profile ----------
    "profile.title": "Profile",
    "profile.subtitle": "Account information",
    "profile.name": "Full name",
    "profile.email": "Email",
    "profile.role": "Role",
    "profile.phone": "Phone",
    "profile.address": "Address",
    "profile.update": "Save changes",
    "profile.updated": "Profile updated",

    // ---------- Points ----------
    "points.title": "Points",
    "points.subtitle": "Redeem points for vouchers",
    "points.yourPoints": "Your points",
    "points.rate": "1 point = 100 VND when redeemed",
    "points.redeem": "Redeem points",
    "points.needMin": "Need at least 100 points to redeem",
    "points.voucherValue": "Voucher value",
    "points.redeemNow": "Redeem",
    "points.history": "Accumulated history",
    "points.noHistory": "No transactions yet",
    "points.noEnough": "Not enough points",
    "points.success": "Redeemed successfully",

    // ---------- Chat ----------
    "chat.title": "Chat Support",
    "chat.subtitle": "Chat with Canteen",
    "chat.placeholder": "Type message...",
    "chat.empty": "No messages yet. Ask Canteen anything!",
    "chat.online": "Online",
    "chat.support": "Canteen VWA Support",
    "chat.customerMessages": "Customer messages",
    "chat.noConversations": "No conversations",
    "chat.selectConv": "Select a conversation to start",
    "chat.reply": "Reply to customer...",

    // ---------- Owner pages ----------
    "owner.overview": "Overview",
    "owner.employeesTitle": "Employee Management",
    "owner.employeesDesc": "Employee list",
    "owner.addEmployee": "Add employee",
    "owner.editEmployee": "Edit employee",
    "owner.searchEmployee": "Search employee...",
    "owner.attendanceTitle": "Attendance",
    "owner.attendanceDesc": "Employee attendance history",
    "owner.customersTitle": "Customer Management",
    "owner.customersDesc": "Customer list",
    "owner.searchCustomer": "Search by name, email, phone...",
    "owner.menuTitle": "Menu Management",
    "owner.menuDesc": "Dishes",
    "owner.addDish": "Add dish",
    "owner.editDish": "Edit dish",
    "owner.searchDish": "Search dish...",
    "owner.priceHistoryTitle": "Price History",
    "owner.priceHistoryDesc": "Track dish price changes",
    "owner.inventoryTitle": "Inventory",
    "owner.inventoryDesc": "Ingredients",
    "owner.addIngredient": "Add ingredient",
    "owner.importStock": "Import stock",
    "owner.importHistory": "Import history",
    "owner.reportsTitle": "Reports",
    "owner.reportsDesc": "Revenue",
    "owner.permissionsTitle": "Permissions",
    "owner.permissionsDesc": "Detailed permissions per user",
    "owner.backupTitle": "Data Backup",
    "owner.backupDesc": "Export / import / reset database",
    "owner.searchCustomerFull": "Search by name, email, phone...",
    "owner.exportData": "Export Excel",
    "owner.employeeId": "Emp ID",
    "owner.customerId": "Cust ID",
    "owner.ingredientId": "Code",
    "owner.ingredient": "Ingredient",
    "owner.minStock": "Min stock",
    "owner.unit": "Unit",
    "owner.totalIngredients": "Total ingredients",
    "owner.lowStockCount": "Low stock",
    "owner.outOfStockCount": "Out of stock",
    "owner.availableCount": "Available",
    "owner.category": "Category",
    "owner.description": "Description",
    "owner.image": "Image",
    "owner.reason": "Price change reason",

    // ---------- Employee ----------
    "employee.overview": "Employee Overview",
    "employee.welcome": "Let's have a productive day!",
    "employee.checkIn": "Attendance",
    "employee.checkInDesc": "Check-in / Check-out",
    "employee.ordersTitle": "Orders",
    "employee.ordersDesc": "Process customer orders",
    "employee.menuTitle": "Menu",
    "employee.menuDesc": "View dish status",
    "employee.chatTitle": "Customer Chat",
    "employee.chatDesc": "Support customers",
    "employee.ordersToday": "Today's orders",
    "employee.pendingOrders": "Pending",
    "employee.serving": "Dishes served",
    "employee.lowStock": "Low stock items",
    "employee.process": "Process",
    "employee.confirm": "Confirm",
    "employee.startPrep": "Start preparing",
    "employee.readyForPickup": "Ready for pickup",
    "employee.markDone": "Complete",
    "employee.processOrder": "Orders to process",
    "employee.priority": "Priority by order time",
    "employee.viewAll": "View all",

    // ---------- Chart ----------
    "chart.revenueByDay": "Revenue by day",
    "chart.last7Days": "Millions VND • Last 7 days",
    "chart.todayOrders": "Today's order status",
    "chart.orders": "orders",
    "chart.completed": "Completed",
    "chart.processing": "Processing",
    "chart.pending": "Pending",
    "chart.cancelled": "Cancelled",
    "chart.soldToday": "Top sellers today",
    "chart.newOrders": "New orders",

    // ---------- Promo ----------
    "promo.redeeming": "Redeeming...",
    "promo.claiming": "Claiming...",
    "promo.copySuccess": "Code copied",
    "promo.claimSuccess": "Voucher claimed!",

    // ---------- Wallet ----------
    "wallet.title": "Canteen Wallet",
    "wallet.balance": "Available balance",
    "wallet.deposit": "Deposit",
    "wallet.withdraw": "Withdraw",
    "wallet.linkBank": "Link bank",
    "wallet.transactions": "Transactions",
    "wallet.noTx": "No transactions yet",

    // ---------- Theme ----------
    "theme.toLight": "Light mode",
    "theme.toDark": "Dark mode",

    // ---------- Language ----------
    "lang.vi": "Tiếng Việt",
    "lang.en": "English",
    "lang.select": "Select language"
  }
};

// ============================================================
// HÀM HELPER
// ============================================================

/**
 * Lấy ngôn ngữ hiện tại từ localStorage
 * Mặc định: "vi" nếu chưa set
 */
export function getLang() {
  return localStorage.getItem("canteen_lang") || "vi";
}

/**
 * Dịch 1 key sang ngôn ngữ chỉ định (hoặc ngôn ngữ hiện tại)
 * Fallback: ngôn ngữ được chọn → Tiếng Việt → chính key đó
 */
export function t(key, lang) {
  const l = lang || getLang();
  return translations[l]?.[key] || translations.vi[key] || key;
}

/**
 * Đổi ngôn ngữ — lưu vào localStorage + phát event "langchange"
 * để các component đang dùng useTranslation() cập nhật lại
 */
export function setLang(lang) {
  localStorage.setItem("canteen_lang", lang);
  window.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

// ============================================================
// HOOK useTranslation — dùng trong React component
// ============================================================
// Cách dùng:
//   const { t, lang, setLang } = useTranslation();
//   <h1>{t("login.title")}</h1>
// ============================================================

export function useTranslation() {
  const [lang, setLangState] = useState(getLang());

  useEffect(() => {
    const handler = (e) => setLangState(e.detail);
    window.addEventListener("langchange", handler);
    return () => window.removeEventListener("langchange", handler);
  }, []);

  const translate = (key) => t(key, lang);
  return { t: translate, lang, setLang };
}