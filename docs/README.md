# Canteen VWA – Business Analysis Documentation

## 1. Giới thiệu

Thư mục `docs/` chứa các tài liệu đặc tả nghiệp vụ và kiểm thử cho hệ thống quản lý Canteen VWA.

Các tài liệu được xây dựng nhằm:
- Mô tả các luồng nghiệp vụ chính của hệ thống.
- Xác định tiêu chí nghiệm thu cho các chức năng.
- Xây dựng các trường hợp kiểm thử.
- Làm cơ sở cho quá trình review và nghiệm thu chức năng.

## 2. Đối tượng sử dụng

Hệ thống Canteen VWA có ba nhóm người dùng chính:

### 2.1. Customer

Khách hàng sử dụng hệ thống để:
- Xem thực đơn.
- Tìm kiếm món ăn.
- Xem thông tin chi tiết món ăn.
- Chọn món, size và topping.
- Quản lý giỏ hàng.
- Sử dụng voucher và ưu đãi.
- Thanh toán và đặt hàng.
- Theo dõi trạng thái đơn hàng.
- Xem lịch sử đơn hàng.
- Sử dụng ví Canteen.
- Đánh giá món ăn.
- Chat và nhận hỗ trợ.

### 2.2. Employee

Nhân viên sử dụng hệ thống để:
- Đăng nhập vào khu vực Employee.
- Chấm công.
- Theo dõi ca làm.
- Tiếp nhận đơn hàng.
- Xử lý đơn hàng.
- Cập nhật trạng thái đơn hàng.
- Quản lý trạng thái món ăn theo quyền được cấp.
- Chat và hỗ trợ Customer.

### 2.3. Owner

Owner sử dụng hệ thống để:
- Theo dõi Dashboard.
- Quản lý nhân viên.
- Quản lý khách hàng.
- Quản lý phân quyền.
- Quản lý thực đơn.
- Quản lý giá món ăn.
- Quản lý kho và tồn kho.
- Quản lý voucher và khuyến mãi.
- Quản lý ca làm và chấm công.
- Theo dõi tài chính.
- Xem báo cáo và thống kê.
- Quản lý các chức năng quản trị theo quyền được cấp.

## 3. Danh sách tài liệu

### 3.1. User Flows

**File:** `user-flows.md`

Mô tả các luồng nghiệp vụ chính của:
- Customer.
- Employee.
- Owner.

### 3.2. Acceptance Criteria

**File:** `acceptance-criteria.md`

Mô tả các tiêu chí nghiệm thu đối với các chức năng chính của hệ thống.

Acceptance Criteria xác định các điều kiện mà chức năng phải đáp ứng để được xem là hoạt động đúng theo yêu cầu nghiệp vụ.

### 3.3. Test Cases

**File:** `test-cases.md`

Mô tả các trường hợp kiểm thử đối với các chức năng của hệ thống.

Các nhóm kiểm thử gồm:
- Customer Test Cases.
- Employee Test Cases.
- Owner Test Cases.
- Security & Permission Test Cases.

Mỗi Test Case bao gồm:
- Mã Test Case.
- Chức năng kiểm thử.
- Điều kiện trước khi kiểm thử.
- Các bước thực hiện.
- Kết quả mong đợi.

## 4. Mối liên hệ giữa các tài liệu

Các tài liệu được liên kết theo quy trình:

User Flows
    ↓
Acceptance Criteria
    ↓
Test Cases
    ↓
Kiểm thử chức năng

Trong đó:
- User Flows mô tả người dùng thực hiện nghiệp vụ như thế nào.
- Acceptance Criteria xác định chức năng cần đáp ứng những điều kiện nào.
- Test Cases kiểm tra chức năng có đáp ứng các điều kiện đã xác định hay không.

## 5. Quy ước mã tài liệu

### 5.1. User Flow

Customer:
`UF-CUS-XX`

Employee:
`UF-EMP-XX`

Owner:
`UF-OWN-XX`

Trong đó:
- UF = User Flow.
- CUS = Customer.
- EMP = Employee.
- OWN = Owner.
- XX = Số thứ tự.

### 5.2. Acceptance Criteria

Customer:
`AC-CUS-XX`

Employee:
`AC-EMP-XX`

Owner:
`AC-OWN-XX`

Trong đó:
- AC = Acceptance Criteria.
- CUS = Customer.
- EMP = Employee.
- OWN = Owner.
- XX = Số thứ tự.

### 5.3. Test Case

Customer:
`TC-CUS-XX`

Employee:
`TC-EMP-XX`

Owner:
`TC-OWN-XX`

Security:
`TC-SEC-XX`

Trong đó:
- TC = Test Case.
- CUS = Customer.
- EMP = Employee.
- OWN = Owner.
- SEC = Security.
- XX = Số thứ tự.

## 6. Quy tắc cập nhật tài liệu

Khi có thay đổi về nghiệp vụ hoặc chức năng hệ thống:

1. Cập nhật User Flow nếu luồng nghiệp vụ thay đổi.
2. Cập nhật Acceptance Criteria nếu điều kiện nghiệm thu thay đổi.
3. Cập nhật Test Cases nếu cần bổ sung hoặc thay đổi trường hợp kiểm thử.
4. Kiểm tra sự thống nhất giữa User Flow, Acceptance Criteria và Test Cases.
5. Commit thay đổi với nội dung mô tả rõ ràng.

Các thay đổi trong tài liệu BA cần thực hiện trong phạm vi được phân công.

## 7. Phạm vi tài liệu

Các tài liệu trong thư mục này tập trung vào:
- Phân tích nghiệp vụ.
- Luồng sử dụng hệ thống.
- Tiêu chí nghiệm thu.
- Kiểm thử chức năng.
- Phân quyền người dùng.

Các tài liệu này không mô tả chi tiết:
- Kiến trúc source code.
- Cấu trúc database.
- Chi tiết implementation của API.
- Framework hoặc thư viện sử dụng.
- Cấu hình môi trường triển khai.

## 8. Cấu trúc thư mục

docs/
├── README.md
├── user-flows.md
├── acceptance-criteria.md
└── test-cases.md

| File | Nội dung |
|---|---|
| `README.md` | Tổng quan bộ tài liệu BA |
| `user-flows.md` | Luồng nghiệp vụ của Customer, Employee và Owner |
| `acceptance-criteria.md` | Tiêu chí nghiệm thu chức năng |
| `test-cases.md` | Các trường hợp kiểm thử |

## 9. Quy trình sử dụng tài liệu

### Bước 1 – Phân tích User Flow

Xác định:
- Người dùng là ai.
- Người dùng muốn thực hiện nghiệp vụ gì.
- Các bước thực hiện.
- Điều kiện đầu vào.
- Kết quả sau khi hoàn thành.

### Bước 2 – Xác định Acceptance Criteria

Từ User Flow, xác định các điều kiện mà hệ thống phải đáp ứng.

### Bước 3 – Xây dựng Test Cases

Dựa trên Acceptance Criteria để xây dựng các trường hợp kiểm thử.

### Bước 4 – Thực hiện kiểm thử

Thực hiện Test Case trên hệ thống và đối chiếu kết quả thực tế với kết quả mong đợi.

### Bước 5 – Cập nhật tài liệu

Nếu chức năng thay đổi, cập nhật các tài liệu liên quan để đảm bảo tính nhất quán.

## 10. Quản lý tài liệu bằng Git

Tài liệu BA được quản lý trên Git theo branch được phân công.

Đối với Issue #4:

Branch: `docs/4-spec-tai-lieu`

Quy trình thực hiện:

Tạo/Cập nhật tài liệu
        ↓
Kiểm tra nội dung
        ↓
git add docs/
        ↓
git commit
        ↓
git push
        ↓
Tạo Pull Request
        ↓
Review
        ↓
Merge vào main

Không tự ý merge Pull Request khi chưa được người phụ trách xác nhận.

## 11. Trạng thái tài liệu

| Tài liệu | Trạng thái |
|---|---|
| User Flows | Completed |
| Acceptance Criteria | Completed |
| Test Cases | Completed |
| BA Documentation README | Completed |

## 12. Kết luận

Bộ tài liệu trong thư mục `docs/` cung cấp cơ sở để:
- Thống nhất cách hiểu về nghiệp vụ hệ thống.
- Xác định rõ yêu cầu của từng nhóm người dùng.
- Xây dựng tiêu chí nghiệm thu.
- Xây dựng và thực hiện Test Case.
- Hỗ trợ quá trình review và nghiệm thu chức năng của hệ thống Canteen VWA.