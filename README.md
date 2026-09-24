# 🍽️ Canteen VWA — Hệ thống quản lý Canteen

Hệ thống đặt món và quản lý Canteen dành cho **khách hàng**, **nhân viên** và **quản trị viên**.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

---

## ✨ Tính năng

### 👤 Khách hàng (Customer)
- Xem thực đơn, tìm kiếm, lọc theo danh mục
- Đặt món, thêm topping, chọn size
- Thanh toán: Tiền mặt / VietQR / Ví Canteen
- Tích điểm, đổi voucher
- Chat với nhân viên hoặc ChatBot AI
- Quản lý ví Canteen (nạp/rút/liên kết ngân hàng)

### 👨‍🍳 Nhân viên (Employee)
- Chấm công check-in/check-out theo ca
- Xử lý đơn hàng (xác nhận → chuẩn bị → sẵn sàng → hoàn thành)
- Xem thực đơn, bật/tắt món
- Chat hỗ trợ khách hàng

### 👑 Quản trị viên (Admin)
- Dashboard doanh thu realtime
- Quản lý nhân viên, khách hàng, phân quyền
- Quản lý thực đơn, danh mục, kho nguyên liệu
- Quản lý ca làm việc, chấm công
- Báo cáo, tài chính, đối soát
- Quản lý voucher, ví Canteen
- Backup / restore database

---

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Express 5 + JWT auth |
| Database | JSON file (`canteen-db.json`) |
| Charts | Recharts |
| Icons | Lucide React |
| Styles | CSS thuần (không Tailwind) |

---

## 🚀 Cài đặt

### Yêu cầu
- Node.js >= 18
- npm >= 9

### Các bước

```bash
# 1. Clone repo
git clone https://github.com/<your-username>/Canteen-Goo.git
cd Canteen-Goo

# 2. Cài dependencies
npm install

# 3. Tạo file .env từ template
cp .env.example .env
# Sửa JWT_SECRET trong .env (xem hướng dẫn bên dưới)

# 4. Chạy dev (FE + BE song song)
npm run dev:all