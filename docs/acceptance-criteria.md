# Acceptance Criteria – Canteen VWA

## 1. Tổng quan

Tài liệu này mô tả các tiêu chí nghiệm thu cho các chức năng chính của hệ thống Canteen VWA.

Các tiêu chí được xây dựng dựa trên các nhóm người dùng chính:

- **Customer**: khách hàng/người dùng đặt món.
- **Employee**: nhân viên canteen.
- **Owner**: chủ/quản trị hệ thống.

Một chức năng được xem là đạt khi đáp ứng đầy đủ các điều kiện nghiệm thu tương ứng và không phát sinh lỗi làm sai lệch dữ liệu hoặc quy trình nghiệp vụ.

---

# 2. Customer Acceptance Criteria

## AC-CUS-01 – Đăng ký và đăng nhập

### Acceptance Criteria

- Customer có thể nhập thông tin đăng ký tài khoản.
- Hệ thống kiểm tra tính hợp lệ của thông tin đăng ký.
- Hệ thống không cho phép đăng ký tài khoản đã tồn tại.
- Customer có thể đăng nhập bằng tài khoản hợp lệ.
- Hệ thống từ chối đăng nhập khi thông tin không chính xác.
- Sau khi đăng nhập thành công, Customer được chuyển đến khu vực dành cho Customer.

---

## AC-CUS-02 – Xem và tìm kiếm thực đơn

### Acceptance Criteria

- Customer có thể xem danh sách món ăn.
- Hệ thống hiển thị tên món, giá và trạng thái bán.
- Customer có thể tìm kiếm món ăn.
- Customer có thể lọc món theo danh mục nếu chức năng được hỗ trợ.
- Customer có thể chọn món để xem thông tin chi tiết.
- Món không khả dụng phải được hiển thị đúng trạng thái.

---

## AC-CUS-03 – Chọn món, size và topping

### Acceptance Criteria

- Customer có thể chọn món ăn.
- Customer có thể chọn size đối với món hỗ trợ nhiều size.
- Customer có thể chọn topping đối với món hỗ trợ topping.
- Customer có thể thay đổi số lượng món.
- Hệ thống tính đúng giá dựa trên món, size, topping và số lượng.
- Customer có thể thêm cấu hình món vào giỏ hàng.
- Hệ thống không cho phép đặt lựa chọn không còn khả dụng.

---

## AC-CUS-04 – Quản lý giỏ hàng

### Acceptance Criteria

- Customer có thể xem các món đang có trong giỏ hàng.
- Customer có thể thay đổi số lượng món.
- Customer có thể xóa món khỏi giỏ hàng.
- Hệ thống tự động cập nhật tổng tiền sau khi giỏ hàng thay đổi.
- Giỏ hàng phải phản ánh đúng món và số lượng Customer đã lựa chọn.
- Customer chỉ có thể tiếp tục đặt hàng khi giỏ hàng hợp lệ.

---

## AC-CUS-05 – Voucher và khuyến mãi

### Acceptance Criteria

- Customer có thể nhập hoặc chọn voucher hợp lệ.
- Hệ thống kiểm tra điều kiện sử dụng voucher.
- Voucher hợp lệ được áp dụng đúng mức giảm.
- Voucher hết hạn không được áp dụng.
- Voucher không đủ điều kiện không được áp dụng.
- Tổng tiền được cập nhật sau khi voucher được áp dụng.
- Hệ thống thông báo rõ lý do khi voucher không hợp lệ.

---

## AC-CUS-06 – Thanh toán và đặt hàng

### Acceptance Criteria

- Customer có thể kiểm tra lại thông tin đơn trước khi đặt.
- Customer có thể lựa chọn phương thức thanh toán được hệ thống hỗ trợ.
- Customer có thể lựa chọn khung giờ nhận món nếu chức năng được áp dụng.
- Hệ thống tính đúng tổng tiền trước và sau ưu đãi.
- Customer có thể xác nhận đặt hàng khi thông tin hợp lệ.
- Hệ thống tạo đơn hàng sau khi đặt thành công.
- Hệ thống ghi nhận trạng thái thanh toán.
- Hệ thống hiển thị thông tin đơn hàng sau khi đặt thành công.
- Hệ thống không tạo đơn khi dữ liệu đặt hàng không hợp lệ.

---

## AC-CUS-07 – Ví Canteen

### Acceptance Criteria

- Customer có thể xem số dư ví.
- Hệ thống hiển thị số dư chính xác.
- Hệ thống kiểm tra số dư trước khi thực hiện giao dịch.
- Giao dịch hợp lệ làm thay đổi số dư tương ứng.
- Hệ thống lưu lịch sử giao dịch.
- Hệ thống từ chối giao dịch khi số dư không đủ.
- Hệ thống thông báo khi giao dịch không hợp lệ.

---

## AC-CUS-08 – Theo dõi đơn hàng

### Acceptance Criteria

- Customer có thể xem danh sách đơn hàng của mình.
- Customer có thể xem chi tiết từng đơn hàng.
- Hệ thống hiển thị đúng trạng thái hiện tại của đơn hàng.
- Trạng thái đơn hàng được cập nhật theo quá trình xử lý.
- Đơn hàng có thể chuyển theo quy trình:

`PENDING → CONFIRMED → PREPARING → READY → COMPLETED`

- Đơn hàng có thể chuyển sang `REJECTED` hoặc `CANCELLED` trong các trường hợp phù hợp.
- Hệ thống không cho phép chuyển trạng thái trái với quy trình nghiệp vụ.

---

## AC-CUS-09 – Đánh giá món ăn

### Acceptance Criteria

- Customer có thể đánh giá món sau khi đơn hàng hoàn tất.
- Customer có thể nhập nội dung đánh giá.
- Customer có thể lựa chọn mức đánh giá.
- Hệ thống kiểm tra dữ liệu trước khi lưu.
- Đánh giá hợp lệ được lưu thành công.
- Customer không thể đánh giá một món khi chưa đủ điều kiện đánh giá.

---

## AC-CUS-10 – Chat và hỗ trợ

### Acceptance Criteria

- Customer có thể mở chức năng chat.
- Customer có thể gửi tin nhắn.
- Hệ thống hiển thị tin nhắn đã gửi.
- Employee có thể nhận và phản hồi tin nhắn.
- Customer có thể xem phản hồi.
- Nội dung cuộc hội thoại được lưu theo chức năng của hệ thống.

---

# 3. Employee Acceptance Criteria

## AC-EMP-01 – Đăng nhập Employee

### Acceptance Criteria

- Employee có thể đăng nhập bằng tài khoản hợp lệ.
- Hệ thống kiểm tra quyền của tài khoản.
- Tài khoản không có quyền Employee không được truy cập khu vực Employee.
- Employee được chuyển đến giao diện phù hợp sau khi đăng nhập thành công.
- Hệ thống thông báo lỗi khi thông tin đăng nhập không chính xác.

---

## AC-EMP-02 – Chấm công

### Acceptance Criteria

- Employee có thể thực hiện chấm công.
- Hệ thống ghi nhận thời gian chấm công.
- Hệ thống lưu thông tin chấm công.
- Employee có thể xem thông tin chấm công của mình.
- Hệ thống không ghi nhận dữ liệu chấm công không hợp lệ.

---

## AC-EMP-03 – Xử lý đơn hàng

### Acceptance Criteria

- Employee có thể xem danh sách đơn hàng cần xử lý.
- Employee có thể xem thông tin chi tiết đơn hàng.
- Employee có thể xác nhận đơn hàng.
- Employee có thể từ chối đơn hàng trong trường hợp phù hợp.
- Employee có thể cập nhật trạng thái chuẩn bị món.
- Employee có thể cập nhật đơn sang `READY` khi món đã sẵn sàng.
- Đơn được cập nhật `COMPLETED` khi quá trình giao món hoàn tất.
- Hệ thống không cho phép Employee thực hiện chuyển trạng thái trái quy trình.

---

## AC-EMP-04 – Quản lý trạng thái món

### Acceptance Criteria

- Employee có thể xem danh sách món theo quyền được cấp.
- Employee có thể xem trạng thái bán của món.
- Employee có thể cập nhật trạng thái món khi có quyền.
- Hệ thống kiểm tra dữ liệu trước khi lưu.
- Employee không có quyền không được thay đổi dữ liệu.
- Thay đổi hợp lệ được lưu vào hệ thống.

---

## AC-EMP-05 – Ca làm

### Acceptance Criteria

- Employee có thể xem ca làm được phân công.
- Employee có thể xem lịch làm việc.
- Employee có thể đăng ký ca nếu hệ thống cho phép.
- Hệ thống không cho phép đăng ký ca đã đủ số lượng.
- Hệ thống lưu thông tin ca làm hợp lệ.

---

## AC-EMP-06 – Chat với Customer

### Acceptance Criteria

- Employee có thể xem danh sách cuộc hội thoại.
- Employee có thể mở cuộc hội thoại.
- Employee có thể xem tin nhắn từ Customer.
- Employee có thể gửi phản hồi.
- Customer nhận được phản hồi.
- Nội dung trao đổi được lưu theo chức năng của hệ thống.

---

# 4. Owner Acceptance Criteria

## AC-OWN-01 – Dashboard

### Acceptance Criteria

- Owner có thể đăng nhập vào hệ thống quản trị.
- Hệ thống hiển thị Dashboard sau khi đăng nhập thành công.
- Dashboard hiển thị các thông tin tổng quan được hệ thống hỗ trợ.
- Dữ liệu trên Dashboard phải được lấy từ dữ liệu hệ thống.
- Owner có thể truy cập các chức năng quản trị từ Dashboard.

---

## AC-OWN-02 – Quản lý nhân viên

### Acceptance Criteria

- Owner có thể xem danh sách nhân viên.
- Owner có thể xem thông tin nhân viên.
- Owner có thể thêm nhân viên khi dữ liệu hợp lệ.
- Owner có thể cập nhật thông tin nhân viên.
- Hệ thống kiểm tra dữ liệu trước khi lưu.
- Hệ thống không cho phép tạo tài khoản bị trùng thông tin định danh.

---

## AC-OWN-03 – Quản lý khách hàng

### Acceptance Criteria

- Owner có thể xem danh sách Customer.
- Owner có thể xem thông tin tài khoản Customer.
- Owner có thể thực hiện các thao tác quản lý được hệ thống hỗ trợ.
- Hệ thống kiểm tra quyền Owner trước khi thực hiện thao tác.
- Dữ liệu được cập nhật chính xác sau thao tác hợp lệ.

---

## AC-OWN-04 – Phân quyền

### Acceptance Criteria

- Owner có thể xem thông tin quyền của tài khoản.
- Owner có thể thiết lập quyền theo chức năng được hệ thống hỗ trợ.
- Hệ thống kiểm tra dữ liệu quyền trước khi lưu.
- Thay đổi quyền được lưu thành công khi hợp lệ.
- Người dùng chỉ có thể truy cập chức năng phù hợp với quyền hiện tại.

---

## AC-OWN-05 – Quản lý thực đơn

### Acceptance Criteria

- Owner có thể xem danh sách món ăn.
- Owner có thể thêm món mới.
- Owner có thể cập nhật thông tin món.
- Owner có thể cập nhật giá món.
- Owner có thể cập nhật trạng thái bán.
- Owner có thể quản lý hình ảnh món theo chức năng hệ thống.
- Hệ thống kiểm tra dữ liệu trước khi lưu.
- Thông tin món được cập nhật chính xác sau khi lưu.

---

## AC-OWN-06 – Lịch sử giá

### Acceptance Criteria

- Owner có thể xem thông tin giá món.
- Hệ thống lưu lịch sử thay đổi giá.
- Owner có thể xem các lần thay đổi giá.
- Thông tin lịch sử phải thể hiện đúng dữ liệu được hệ thống ghi nhận.

---

## AC-OWN-07 – Quản lý kho

### Acceptance Criteria

- Owner có thể xem danh sách nguyên liệu.
- Owner có thể xem số lượng tồn kho.
- Owner có thể cập nhật dữ liệu kho theo quyền.
- Hệ thống kiểm tra dữ liệu trước khi cập nhật.
- Số lượng tồn kho được cập nhật chính xác.
- Hệ thống thông báo khi dữ liệu kho không hợp lệ.

---

## AC-OWN-08 – Voucher và khuyến mãi

### Acceptance Criteria

- Owner có thể xem danh sách voucher.
- Owner có thể tạo voucher mới.
- Owner có thể thiết lập điều kiện sử dụng.
- Owner có thể cập nhật thông tin voucher.
- Hệ thống kiểm tra mã voucher trước khi lưu.
- Hệ thống không cho phép mã voucher bị trùng.
- Voucher được hiển thị đúng trạng thái và thời gian áp dụng.

---

## AC-OWN-09 – Quản lý ca làm và chấm công

### Acceptance Criteria

- Owner có thể xem danh sách ca làm.
- Owner có thể tạo ca làm.
- Owner có thể điều chỉnh thông tin ca theo quyền.
- Owner có thể phân công Employee vào ca.
- Owner có thể xem dữ liệu chấm công.
- Hệ thống lưu thông tin ca làm và chấm công chính xác.

---

## AC-OWN-10 – Tài chính

### Acceptance Criteria

- Owner có thể truy cập chức năng tài chính.
- Hệ thống tổng hợp dữ liệu giao dịch.
- Owner có thể xem dữ liệu doanh thu được hệ thống hỗ trợ.
- Owner có thể lọc dữ liệu theo khoảng thời gian nếu chức năng được hỗ trợ.
- Dữ liệu hiển thị phải phản ánh đúng dữ liệu giao dịch của hệ thống.

---

## AC-OWN-11 – Báo cáo và thống kê

### Acceptance Criteria

- Owner có thể truy cập chức năng báo cáo.
- Owner có thể lựa chọn loại báo cáo được hệ thống hỗ trợ.
- Owner có thể lựa chọn khoảng thời gian.
- Hệ thống tổng hợp dữ liệu chính xác.
- Hệ thống hiển thị kết quả báo cáo.
- Khi không có dữ liệu, hệ thống phải thông báo rõ ràng.

---

## AC-OWN-12 – Backup và Restore

### Acceptance Criteria

- Owner có thể thực hiện Backup khi có quyền.
- Hệ thống tạo dữ liệu Backup thành công.
- Hệ thống thông báo kết quả Backup.
- Owner có thể thực hiện Restore theo chức năng được hỗ trợ.
- Hệ thống kiểm tra dữ liệu trước khi Restore.
- Dữ liệu Backup không hợp lệ không được sử dụng để Restore.
- Hệ thống thông báo khi Backup hoặc Restore xảy ra lỗi.

---

# 5. Tiêu chí chung của hệ thống

- Hệ thống phải kiểm tra quyền truy cập trước các chức năng yêu cầu xác thực.
- Người dùng không được truy cập chức năng ngoài quyền được cấp.
- Dữ liệu nhập vào phải được kiểm tra trước khi lưu.
- Các thao tác thành công phải cập nhật dữ liệu chính xác.
- Các thao tác thất bại phải có thông báo phù hợp.
- Trạng thái đơn hàng phải tuân thủ quy trình nghiệp vụ.
- Các chức năng quản lý phải hạn chế thao tác trái quyền.
- Dữ liệu hiển thị cho người dùng phải phù hợp với vai trò và quyền truy cập.