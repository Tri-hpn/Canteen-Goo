# User Flows – Canteen VWA

## 1. Tổng quan

Tài liệu này mô tả các luồng nghiệp vụ chính của hệ thống quản lý Canteen VWA theo ba nhóm người dùng:

- **Customer**: khách hàng/người dùng đặt món.
- **Employee**: nhân viên canteen.
- **Owner**: chủ/quản trị hệ thống.

Tài liệu tập trung mô tả hành động của người dùng và phản hồi mong đợi của hệ thống, không mô tả chi tiết triển khai mã nguồn.

---

# 2. Customer User Flows

## UF-CUS-01 – Đăng ký và đăng nhập

**Actor:** Customer

### Luồng chính

1. Customer truy cập hệ thống.
2. Customer chọn chức năng đăng ký.
3. Customer nhập thông tin tài khoản.
4. Hệ thống kiểm tra dữ liệu đăng ký.
5. Hệ thống tạo tài khoản nếu thông tin hợp lệ.
6. Customer đăng nhập bằng tài khoản đã đăng ký.
7. Hệ thống xác thực thông tin đăng nhập.
8. Hệ thống chuyển Customer vào khu vực dành cho Customer.

### Luồng ngoại lệ

- Thông tin đăng ký không hợp lệ → hệ thống thông báo lỗi.
- Tài khoản đã tồn tại → hệ thống yêu cầu sử dụng thông tin khác.
- Sai thông tin đăng nhập → hệ thống thông báo đăng nhập thất bại.

---

## UF-CUS-02 – Xem và tìm kiếm thực đơn

**Actor:** Customer

### Luồng chính

1. Customer truy cập trang thực đơn.
2. Hệ thống hiển thị danh sách món ăn.
3. Customer tìm kiếm món ăn theo nhu cầu.
4. Customer có thể lọc món theo danh mục.
5. Customer chọn món để xem thông tin chi tiết.
6. Hệ thống hiển thị thông tin món ăn, giá và trạng thái bán.

---

## UF-CUS-03 – Chọn món, size và topping

**Actor:** Customer

### Luồng chính

1. Customer chọn một món ăn.
2. Hệ thống hiển thị thông tin chi tiết món.
3. Customer chọn size nếu món có nhiều lựa chọn.
4. Customer chọn topping nếu món hỗ trợ topping.
5. Customer lựa chọn số lượng.
6. Hệ thống tính giá theo lựa chọn của Customer.
7. Customer thêm món vào giỏ hàng.

### Luồng ngoại lệ

- Món không còn khả dụng → hệ thống thông báo món không thể đặt.
- Topping/size không khả dụng → hệ thống yêu cầu lựa chọn lại.

---

## UF-CUS-04 – Quản lý giỏ hàng

**Actor:** Customer

### Luồng chính

1. Customer mở giỏ hàng.
2. Hệ thống hiển thị danh sách món đã chọn.
3. Customer thay đổi số lượng món.
4. Customer có thể xóa món khỏi giỏ hàng.
5. Hệ thống cập nhật tổng tiền.
6. Customer tiếp tục đến bước thanh toán khi giỏ hàng hợp lệ.

---

## UF-CUS-05 – Áp dụng voucher và ưu đãi

**Actor:** Customer

### Luồng chính

1. Customer kiểm tra giỏ hàng hoặc bước thanh toán.
2. Customer chọn voucher/khuyến mãi.
3. Hệ thống kiểm tra điều kiện sử dụng voucher.
4. Nếu hợp lệ, hệ thống áp dụng mức giảm giá.
5. Hệ thống cập nhật tổng tiền cần thanh toán.

### Luồng ngoại lệ

- Voucher hết hạn → không áp dụng.
- Voucher không đủ điều kiện → hệ thống thông báo lý do.
- Voucher không tồn tại → không áp dụng.

---

## UF-CUS-06 – Thanh toán và đặt hàng

**Actor:** Customer

### Luồng chính

1. Customer kiểm tra giỏ hàng.
2. Customer chọn phương thức thanh toán.
3. Customer chọn khung giờ nhận món nếu có yêu cầu.
4. Hệ thống tính tổng tiền sau ưu đãi.
5. Customer xác nhận đặt hàng.
6. Hệ thống tạo đơn hàng.
7. Hệ thống ghi nhận trạng thái thanh toán.
8. Hệ thống hiển thị thông tin đơn hàng cho Customer.

### Luồng ngoại lệ

- Thanh toán thất bại → hệ thống thông báo và yêu cầu thực hiện lại.
- Thông tin đơn hàng không hợp lệ → không tạo đơn.
- Món không còn khả dụng → yêu cầu Customer cập nhật giỏ hàng.

---

## UF-CUS-07 – Sử dụng ví Canteen

**Actor:** Customer

### Luồng chính

1. Customer truy cập chức năng ví.
2. Hệ thống hiển thị số dư hiện tại.
3. Customer thực hiện thao tác được hệ thống hỗ trợ.
4. Hệ thống kiểm tra số dư và thông tin giao dịch.
5. Hệ thống cập nhật số dư.
6. Hệ thống lưu lịch sử giao dịch.

### Luồng ngoại lệ

- Số dư không đủ → hệ thống thông báo không thể thực hiện giao dịch.
- Giao dịch không hợp lệ → hệ thống từ chối giao dịch.

---

## UF-CUS-08 – Theo dõi đơn hàng

**Actor:** Customer

### Luồng chính

1. Customer truy cập danh sách đơn hàng.
2. Hệ thống hiển thị các đơn đã đặt.
3. Customer chọn một đơn hàng.
4. Hệ thống hiển thị thông tin chi tiết.
5. Customer theo dõi trạng thái xử lý đơn.

### Trạng thái xử lý chính

PENDING → CONFIRMED → PREPARING → READY → COMPLETED

Đơn hàng cũng có thể kết thúc ở trạng thái:

- REJECTED
- CANCELLED

---

## UF-CUS-09 – Đánh giá món ăn

**Actor:** Customer

### Luồng chính

1. Customer truy cập đơn hàng đã hoàn tất.
2. Customer chọn món cần đánh giá.
3. Customer nhập nội dung đánh giá và mức đánh giá.
4. Customer gửi đánh giá.
5. Hệ thống kiểm tra thông tin.
6. Hệ thống lưu đánh giá.

### Luồng ngoại lệ

- Customer chưa hoàn tất đơn hàng → không được đánh giá món.
- Thông tin đánh giá không hợp lệ → hệ thống thông báo lỗi.
- Customer đã đánh giá món → hệ thống xử lý theo quy định của hệ thống.

---

## UF-CUS-10 – Chat và hỗ trợ

**Actor:** Customer

### Luồng chính

1. Customer mở chức năng chat.
2. Customer gửi nội dung cần hỗ trợ.
3. Hệ thống tiếp nhận tin nhắn.
4. Customer nhận phản hồi từ hệ thống hoặc Employee.
5. Hệ thống lưu nội dung cuộc hội thoại.

---

# 3. Employee User Flows

## UF-EMP-01 – Đăng nhập Employee

**Actor:** Employee

### Luồng chính

1. Employee truy cập màn hình đăng nhập.
2. Employee nhập thông tin tài khoản.
3. Hệ thống xác thực tài khoản.
4. Hệ thống kiểm tra quyền Employee.
5. Employee được chuyển đến giao diện Employee.

### Luồng ngoại lệ

- Sai thông tin đăng nhập → hệ thống thông báo lỗi.
- Tài khoản không có quyền Employee → hệ thống từ chối truy cập.

---

## UF-EMP-02 – Chấm công

**Actor:** Employee

### Luồng chính

1. Employee truy cập chức năng chấm công.
2. Employee thực hiện thao tác chấm công.
3. Hệ thống kiểm tra thông tin.
4. Hệ thống ghi nhận thời gian chấm công.
5. Employee có thể xem thông tin chấm công.

### Luồng ngoại lệ

- Chấm công không hợp lệ → hệ thống thông báo lỗi.
- Employee đã chấm công → hệ thống xử lý theo trạng thái hiện tại.

---

## UF-EMP-03 – Quản lý và xử lý đơn hàng

**Actor:** Employee

### Luồng chính

1. Employee truy cập danh sách đơn hàng.
2. Hệ thống hiển thị các đơn cần xử lý.
3. Employee xem thông tin đơn.
4. Employee xác nhận hoặc từ chối đơn.
5. Nếu đơn được xác nhận, Employee tiến hành chuẩn bị món.
6. Employee cập nhật trạng thái đơn.
7. Khi món đã sẵn sàng, Employee cập nhật trạng thái READY.
8. Sau khi hoàn tất giao món, đơn được cập nhật COMPLETED.

### Luồng ngoại lệ

- Đơn không thể xử lý → Employee từ chối đơn.
- Đơn đã bị hủy → Employee không tiếp tục xử lý.
- Đơn đã hoàn tất → Employee không thể thay đổi trạng thái trái với quy trình.

---

## UF-EMP-04 – Quản lý trạng thái món

**Actor:** Employee

### Luồng chính

1. Employee truy cập quản lý thực đơn.
2. Hệ thống hiển thị danh sách món.
3. Employee kiểm tra trạng thái món.
4. Employee cập nhật trạng thái bán của món theo quyền được cấp.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống lưu thay đổi.

### Luồng ngoại lệ

- Món không tồn tại → hệ thống thông báo lỗi.
- Employee không có quyền thay đổi → hệ thống từ chối thao tác.

---

## UF-EMP-05 – Đăng ký và theo dõi ca làm

**Actor:** Employee

### Luồng chính

1. Employee truy cập chức năng ca làm.
2. Hệ thống hiển thị các ca được phân công hoặc đăng ký.
3. Employee lựa chọn ca phù hợp nếu chức năng được cho phép.
4. Hệ thống ghi nhận thông tin ca.
5. Employee theo dõi lịch làm việc.

### Luồng ngoại lệ

- Ca làm đã đủ nhân viên → hệ thống không cho đăng ký.
- Ca làm không còn khả dụng → hệ thống thông báo.

---

## UF-EMP-06 – Chat với Customer

**Actor:** Employee

### Luồng chính

1. Employee mở chức năng chat.
2. Hệ thống hiển thị các cuộc hội thoại.
3. Employee chọn cuộc hội thoại.
4. Employee xem nội dung trao đổi.
5. Employee gửi phản hồi cho Customer.
6. Hệ thống lưu nội dung trao đổi.

---

# 4. Owner User Flows

## UF-OWN-01 – Dashboard và thống kê tổng quan

**Actor:** Owner

### Luồng chính

1. Owner đăng nhập hệ thống.
2. Hệ thống hiển thị Dashboard.
3. Owner xem các thông tin tổng quan.
4. Owner theo dõi tình hình hoạt động của canteen.
5. Owner truy cập các chức năng quản trị cần thiết.

---

## UF-OWN-02 – Quản lý nhân viên

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý nhân viên.
2. Hệ thống hiển thị danh sách nhân viên.
3. Owner xem thông tin nhân viên.
4. Owner thêm, cập nhật hoặc quản lý tài khoản nhân viên theo quyền.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống lưu thay đổi.

### Luồng ngoại lệ

- Thông tin nhân viên không hợp lệ → hệ thống thông báo lỗi.
- Tài khoản đã tồn tại → hệ thống yêu cầu kiểm tra lại.

---

## UF-OWN-03 – Quản lý khách hàng

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý khách hàng.
2. Hệ thống hiển thị danh sách Customer.
3. Owner xem thông tin tài khoản.
4. Owner thực hiện thao tác quản lý được hệ thống hỗ trợ.
5. Hệ thống kiểm tra quyền.
6. Hệ thống cập nhật dữ liệu.

---

## UF-OWN-04 – Quản lý phân quyền

**Actor:** Owner

### Luồng chính

1. Owner truy cập chức năng phân quyền.
2. Hệ thống hiển thị các tài khoản hoặc nhóm quyền.
3. Owner lựa chọn tài khoản cần phân quyền.
4. Owner thiết lập quyền phù hợp.
5. Hệ thống kiểm tra quyền.
6. Hệ thống lưu thay đổi.

### Luồng ngoại lệ

- Quyền không hợp lệ → hệ thống không cho lưu.
- Tài khoản không tồn tại → hệ thống thông báo lỗi.

---

## UF-OWN-05 – Quản lý thực đơn

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý thực đơn.
2. Hệ thống hiển thị danh sách món.
3. Owner thêm món mới hoặc cập nhật món.
4. Owner cập nhật thông tin, giá và trạng thái món.
5. Owner có thể quản lý hình ảnh món.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống lưu thay đổi.

### Luồng ngoại lệ

- Thông tin món không hợp lệ → hệ thống thông báo lỗi.
- Giá món không hợp lệ → hệ thống không cho lưu.
- Món không tồn tại khi cập nhật → hệ thống thông báo lỗi.

---

## UF-OWN-06 – Quản lý lịch sử giá

**Actor:** Owner

### Luồng chính

1. Owner truy cập chức năng lịch sử giá.
2. Hệ thống hiển thị thông tin giá của món.
3. Owner xem các thay đổi giá.
4. Hệ thống lưu và hiển thị lịch sử thay đổi.

---

## UF-OWN-07 – Quản lý kho và tồn kho

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý kho.
2. Hệ thống hiển thị thông tin nguyên liệu và tồn kho.
3. Owner xem số lượng tồn.
4. Owner cập nhật thông tin kho theo quyền được cấp.
5. Hệ thống kiểm tra dữ liệu.
6. Hệ thống cập nhật số lượng.
7. Owner theo dõi tình trạng kho.

### Luồng ngoại lệ

- Số lượng nhập không hợp lệ → hệ thống thông báo lỗi.
- Nguyên liệu không tồn tại → hệ thống thông báo lỗi.

---

## UF-OWN-08 – Quản lý voucher và khuyến mãi

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý voucher.
2. Hệ thống hiển thị danh sách voucher.
3. Owner tạo voucher mới.
4. Owner thiết lập điều kiện áp dụng.
5. Owner cập nhật hoặc quản lý voucher.
6. Hệ thống kiểm tra dữ liệu.
7. Hệ thống lưu thông tin voucher.

### Luồng ngoại lệ

- Mã voucher đã tồn tại → hệ thống thông báo.
- Thời gian áp dụng không hợp lệ → hệ thống không cho lưu.
- Điều kiện voucher không hợp lệ → hệ thống thông báo lỗi.

---

## UF-OWN-09 – Quản lý ca làm và chấm công

**Actor:** Owner

### Luồng chính

1. Owner truy cập quản lý ca làm.
2. Hệ thống hiển thị lịch và ca làm.
3. Owner tạo hoặc điều chỉnh ca.
4. Owner phân công nhân viên.
5. Hệ thống kiểm tra thông tin.
6. Hệ thống lưu lịch làm việc.
7. Owner theo dõi dữ liệu chấm công của Employee.

---

## UF-OWN-10 – Quản lý tài chính

**Actor:** Owner

### Luồng chính

1. Owner truy cập chức năng tài chính.
2. Hệ thống tổng hợp dữ liệu giao dịch.
3. Owner xem thông tin doanh thu và dữ liệu tài chính.
4. Owner lọc hoặc xem dữ liệu theo nhu cầu.
5. Hệ thống hiển thị kết quả.

---

## UF-OWN-11 – Báo cáo và thống kê

**Actor:** Owner

### Luồng chính

1. Owner truy cập chức năng báo cáo.
2. Owner chọn loại báo cáo hoặc khoảng thời gian.
3. Hệ thống tổng hợp dữ liệu.
4. Hệ thống hiển thị kết quả.
5. Owner sử dụng báo cáo để theo dõi hoạt động của canteen.

### Luồng ngoại lệ

- Không có dữ liệu trong khoảng thời gian → hệ thống thông báo không có dữ liệu.
- Tham số báo cáo không hợp lệ → hệ thống thông báo lỗi.

---

## UF-OWN-12 – Sao lưu và khôi phục dữ liệu

**Actor:** Owner

### Luồng chính

1. Owner truy cập chức năng Backup.
2. Owner thực hiện tạo dữ liệu sao lưu.
3. Hệ thống tạo dữ liệu sao lưu.
4. Khi cần thiết, Owner thực hiện Restore.
5. Hệ thống kiểm tra dữ liệu khôi phục.
6. Hệ thống thực hiện khôi phục theo chức năng được hỗ trợ.

### Luồng ngoại lệ

- Dữ liệu backup không hợp lệ → hệ thống từ chối khôi phục.
- Backup/Restore xảy ra lỗi → hệ thống thông báo lỗi.

---

# 5. Luồng tổng quát của hệ thống

## Customer

Đăng nhập → Xem thực đơn → Chọn món → Chọn size/topping → Thêm vào giỏ → Áp dụng voucher → Thanh toán → Đặt hàng → Theo dõi đơn → Nhận món → Đánh giá.

## Employee

Đăng nhập → Chấm công/Ca làm → Xem đơn hàng → Xác nhận/Từ chối → Chuẩn bị món → Cập nhật READY → Hoàn tất đơn.

## Owner

Đăng nhập → Dashboard → Quản lý nhân viên → Quản lý khách hàng → Phân quyền → Quản lý thực đơn → Quản lý kho → Quản lý voucher → Quản lý ca/chấm công → Tài chính → Báo cáo → Backup/Restore.

---

# 6. Quy tắc chung

- Người dùng chỉ được truy cập các chức năng phù hợp với vai trò được cấp.
- Customer tập trung vào các nghiệp vụ mua và theo dõi đơn hàng.
- Employee tập trung vào vận hành đơn hàng và các nghiệp vụ nhân viên.
- Owner quản lý dữ liệu và các chức năng quản trị của hệ thống.
- Các thao tác thay đổi dữ liệu phải được hệ thống kiểm tra trước khi lưu.
- Các trạng thái đơn hàng phải tuân theo quy trình xử lý của hệ thống.
- Khi thao tác không hợp lệ, hệ thống phải thông báo rõ lỗi cho người dùng.