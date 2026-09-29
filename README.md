# Canteen VWA - Hệ thống quản lý Canteen

Hệ thống đặt món và quản lý Canteen dành cho khách hàng, nhân viên và quản trị viên.

**Trạng thái:** Production-ready - deploy tại [https://canteen-goo.vercel.app](https://canteen-goo.vercel.app)

## Mục lục

1. [Tính năng](#1-tính-năng)
2. [Stack công nghệ](#2-stack-công-nghệ)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cài đặt Local](#4-cài-đặt-local)
5. [Biến môi trường](#5-biến-môi-trường)
6. [Scripts có sẵn](#6-scripts-có-sẵn)
7. [Tài khoản demo](#7-tài-khoản-demo-seed-data)
8. [Deploy Production](#8-deploy-production)
9. [Testing & QA](#9-testing--qa)
10. [Troubleshooting](#10-troubleshooting)
11. [Changelog](#11-changelog)
12. [Bảo mật - Cần đọc](#12-bảo-mật---cần-đọc)
13. [License & Credits](#13-license--credits)

---

## 1. Tính năng

### Khách hàng (Customer)
- Xem thực đơn, tìm kiếm, lọc theo danh mục
- Đặt món, thêm topping, chọn size
- Thanh toán: Tiền mặt / VietQR / Ví Canteen
- Tích điểm, đổi voucher, nhận ưu đãi
- Chat với nhân viên hoặc ChatBot AI (gợi ý món theo giá/chủ đề)
- Quản lý ví Canteen (nạp / rút / liên kết ngân hàng)
- Xem lịch sử đơn hàng, đánh giá món đã mua
- Dark mode + responsive mobile
- Đa ngôn ngữ (Tiếng Việt / English)

### Nhân viên (Employee)
- Chấm công check-in / check-out theo ca
- Xử lý đơn hàng: xác nhận -> chuẩn bị -> sẵn sàng -> hoàn thành
- Xem thực đơn, bật / tắt món
- Chat hỗ trợ khách hàng
- Đăng ký ca làm việc tuần sau
- Nhận nhắc nhở trước ca 30 phút

### Quản trị viên (Admin)
- Dashboard doanh thu realtime + KPI trend
- Quản lý nhân viên, khách hàng, phân quyền chi tiết (9 nhóm permissions)
- Quản lý thực đơn, danh mục (có icon + thứ tự), kho nguyên liệu
- Quản lý ca làm việc, chấm công
- Báo cáo chuyên sâu (date range, so sánh kỳ, hourly chart, export CSV)
- Tài chính (tài khoản nhận tiền, chi phí, lợi nhuận, đối soát)
- Quản lý voucher (template + personal), ví Canteen (duyệt nạp/rút)
- Lịch sử thay đổi giá món
- Backup / restore / reset database

---

## 2. Stack công nghệ

- **Frontend:** React 18, Vite 5, React Router v6
- **Backend:** Express 5, JWT auth, bcryptjs
- **Database:** MongoDB Atlas (production), File JSON (dev fallback)
- **Charts:** Recharts 2
- **Icons:** Lucide React
- **Styles:** CSS thuần (không Tailwind)
- **Deploy:** Vercel (Frontend), Node.js runtime (Backend), MongoDB Atlas (Database)

---

## 3. Cấu trúc thư mục

```text
canteengo/
├── src/
│   ├── api.js                    # HTTP client + 401 interceptor
│   ├── App.jsx                   # Root + routing + auth-expired listener
│   ├── main.jsx                  # Entry point
│   ├── i18n.js                   # Đa ngôn ngữ (VI / EN)
│   ├── bannerSlides.js           # Config banner
│   ├── styles.css                # Global styles
│   ├── styles-sky.css            # Theme xanh da trời
│   ├── components/               # 30+ UI components dùng chung
│   │   ├── ConfirmDialog.jsx
│   │   ├── Effects.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── HeaderNav.jsx
│   │   ├── FoodDetailModal.jsx
│   │   ├── PaymentModal.jsx
│   │   ├── ChatBotWidget.jsx
│   │   ├── NotificationBell.jsx
│   │   └── ... (còn nhiều component khác)
│   └── pages/
│       ├── Login.jsx
│       ├── Register.jsx
│       ├── ForgotPassword.jsx
│       ├── StaffProfile.jsx
│       ├── customer/             # 12 trang khách hàng
│       ├── employee/             # 5 trang nhân viên
│       └── owner/                # 16 trang quản trị
├── server-json.js                # Backend Express (single file)
├── test-fixes.ps1                # Regression test (PowerShell - Yêu cầu Windows)
├── split.mjs                     # Utility tách/merge DB JSON
├── vite.config.js
├── vercel.json
├── index.html
├── package.json
├── .env.example
└── README.md