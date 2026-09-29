# Test Cases – Canteen VWA

## 1. Tổng quan

Tài liệu này mô tả các test case dùng để kiểm tra các chức năng chính của hệ thống Canteen VWA.

Các test case được phân chia theo ba nhóm người dùng:

- **Customer**: khách hàng/người dùng đặt món.
- **Employee**: nhân viên canteen.
- **Owner**: chủ/quản trị hệ thống.

Kết quả mong đợi được sử dụng để xác định chức năng có hoạt động đúng theo yêu cầu nghiệp vụ hay không.

---

# 2. Customer Test Cases

## TC-CUS-01 – Đăng ký tài khoản thành công

**Precondition:** Customer chưa có tài khoản.

**Test Steps:**

1. Truy cập chức năng đăng ký.
2. Nhập đầy đủ thông tin hợp lệ.
3. Nhấn nút đăng ký.

**Expected Result:**

- Hệ thống kiểm tra thông tin.
- Tài khoản được tạo thành công.
- Hệ thống thông báo đăng ký thành công.

---

## TC-CUS-02 – Đăng ký với tài khoản đã tồn tại

**Precondition:** Thông tin tài khoản đã tồn tại trong hệ thống.

**Test Steps:**

1. Truy cập chức năng đăng ký.
2. Nhập thông tin đã tồn tại.
3. Nhấn nút đăng ký.

**Expected Result:**

- Hệ thống phát hiện thông tin đã tồn tại.
- Không tạo tài khoản mới.
- Hệ thống hiển thị thông báo lỗi phù hợp.

---

## TC-CUS-03 – Đăng nhập thành công

**Precondition:** Customer có tài khoản hợp lệ.

**Test Steps:**

1. Truy cập màn hình đăng nhập.
2. Nhập thông tin tài khoản hợp lệ.
3. Nhấn đăng nhập.

**Expected Result:**

- Hệ thống xác thực thành công.
- Customer được đăng nhập.
- Hệ thống chuyển đến khu vực Customer.

---

## TC-CUS-04 – Đăng nhập sai thông tin

**Precondition:** Customer có tài khoản.

**Test Steps:**

1. Truy cập màn hình đăng nhập.
2. Nhập sai mật khẩu hoặc thông tin đăng nhập.
3. Nhấn đăng nhập.

**Expected Result:**

- Hệ thống từ chối đăng nhập.
- Không tạo phiên đăng nhập.
- Hệ thống hiển thị thông báo lỗi.

---

## TC-CUS-05 – Xem thực đơn

**Precondition:** Customer truy cập được hệ thống.

**Test Steps:**

1. Mở chức năng thực đơn.
2. Quan sát danh sách món ăn.

**Expected Result:**

- Danh sách món được hiển thị.
- Thông tin món được hiển thị chính xác.
- Giá và trạng thái món được hiển thị.

---

## TC-CUS-06 – Tìm kiếm món ăn

**Precondition:** Hệ thống có dữ liệu món ăn.

**Test Steps:**

1. Mở trang thực đơn.
2. Nhập tên món vào ô tìm kiếm.
3. Thực hiện tìm kiếm.

**Expected Result:**

- Hệ thống trả về các món phù hợp với từ khóa.
- Kết quả tìm kiếm được hiển thị chính xác.

---

## TC-CUS-07 – Xem chi tiết món

**Precondition:** Món ăn tồn tại.

**Test Steps:**

1. Mở trang thực đơn.
2. Chọn một món ăn.

**Expected Result:**

- Hệ thống mở thông tin chi tiết món.
- Thông tin tên món, giá và các lựa chọn được hiển thị.

---

## TC-CUS-08 – Chọn size và topping

**Precondition:** Món hỗ trợ size hoặc topping.

**Test Steps:**

1. Chọn món.
2. Chọn size.
3. Chọn topping.
4. Chọn số lượng.
5. Thêm món vào giỏ hàng.

**Expected Result:**

- Các lựa chọn được ghi nhận.
- Giá món được tính đúng.
- Món được thêm vào giỏ hàng.

---

## TC-CUS-09 – Thêm món vào giỏ hàng

**Precondition:** Món đang khả dụng.

**Test Steps:**

1. Chọn món.
2. Chọn các tùy chọn cần thiết.
3. Nhấn thêm vào giỏ hàng.

**Expected Result:**

- Món xuất hiện trong giỏ hàng.
- Số lượng và giá được hiển thị chính xác.
- Tổng tiền được cập nhật.

---

## TC-CUS-10 – Thay đổi số lượng trong giỏ hàng

**Precondition:** Giỏ hàng có ít nhất một món.

**Test Steps:**

1. Mở giỏ hàng.
2. Tăng hoặc giảm số lượng món.

**Expected Result:**

- Số lượng được cập nhật.
- Thành tiền được cập nhật.
- Tổng tiền được tính lại chính xác.

---

## TC-CUS-11 – Xóa món khỏi giỏ hàng

**Precondition:** Giỏ hàng có món.

**Test Steps:**

1. Mở giỏ hàng.
2. Chọn chức năng xóa món.

**Expected Result:**

- Món được xóa khỏi giỏ hàng.
- Tổng tiền được cập nhật.

---

## TC-CUS-12 – Áp dụng voucher hợp lệ

**Precondition:** Customer có voucher hợp lệ.

**Test Steps:**

1. Thêm món vào giỏ hàng.
2. Đi đến bước thanh toán.
3. Nhập hoặc chọn voucher hợp lệ.
4. Áp dụng voucher.

**Expected Result:**

- Voucher được chấp nhận.
- Mức giảm giá được tính chính xác.
- Tổng tiền được cập nhật.

---

## TC-CUS-13 – Áp dụng voucher không hợp lệ

**Precondition:** Voucher không hợp lệ hoặc đã hết hạn.

**Test Steps:**

1. Đi đến bước thanh toán.
2. Nhập voucher không hợp lệ.
3. Nhấn áp dụng.

**Expected Result:**

- Voucher không được áp dụng.
- Tổng tiền không bị giảm sai.
- Hệ thống hiển thị thông báo phù hợp.

---

## TC-CUS-14 – Đặt hàng thành công

**Precondition:** Customer có giỏ hàng hợp lệ.

**Test Steps:**

1. Kiểm tra giỏ hàng.
2. Chọn phương thức thanh toán.
3. Chọn khung giờ nhận món nếu cần.
4. Xác nhận đặt hàng.

**Expected Result:**

- Đơn hàng được tạo.
- Thông tin đơn hàng được lưu.
- Hệ thống hiển thị thông tin đơn hàng.
- Trạng thái đơn hàng được ghi nhận.

---

## TC-CUS-15 – Đặt hàng khi món không còn khả dụng

**Precondition:** Một món trong giỏ không còn khả dụng.

**Test Steps:**

1. Mở giỏ hàng.
2. Tiến hành đặt hàng.

**Expected Result:**

- Hệ thống phát hiện món không khả dụng.
- Đơn hàng không được tạo sai.
- Customer được yêu cầu cập nhật giỏ hàng.

---

## TC-CUS-16 – Xem lịch sử đơn hàng

**Precondition:** Customer đã có đơn hàng.

**Test Steps:**

1. Truy cập chức năng đơn hàng.
2. Mở danh sách đơn hàng.

**Expected Result:**

- Danh sách đơn hàng được hiển thị.
- Thông tin đơn hàng chính xác.
- Customer có thể chọn đơn để xem chi tiết.

---

## TC-CUS-17 – Theo dõi trạng thái đơn hàng

**Precondition:** Customer có đơn hàng đang xử lý.

**Test Steps:**

1. Mở chi tiết đơn hàng.
2. Theo dõi trạng thái đơn.

**Expected Result:**

- Hệ thống hiển thị trạng thái hiện tại.
- Trạng thái được cập nhật theo quá trình xử lý.

---

## TC-CUS-18 – Đánh giá món ăn

**Precondition:** Đơn hàng đã hoàn tất.

**Test Steps:**

1. Mở đơn hàng đã hoàn tất.
2. Chọn món cần đánh giá.
3. Nhập nội dung đánh giá.
4. Chọn mức đánh giá.
5. Gửi đánh giá.

**Expected Result:**

- Đánh giá được kiểm tra.
- Đánh giá hợp lệ được lưu thành công.
- Customer nhận được thông báo kết quả.

---

## TC-CUS-19 – Chat với Employee

**Precondition:** Customer đã đăng nhập.

**Test Steps:**

1. Mở chức năng chat.
2. Nhập nội dung tin nhắn.
3. Gửi tin nhắn.

**Expected Result:**

- Tin nhắn được gửi thành công.
- Nội dung hiển thị trong cuộc hội thoại.
- Employee có thể nhận được tin nhắn.

---

## TC-CUS-20 – Kiểm tra ví Canteen

**Precondition:** Customer đã đăng nhập.

**Test Steps:**

1. Mở chức năng ví.
2. Xem số dư.
3. Kiểm tra lịch sử giao dịch.

**Expected Result:**

- Số dư được hiển thị chính xác.
- Lịch sử giao dịch được hiển thị theo dữ liệu hệ thống.

---

# 3. Employee Test Cases

## TC-EMP-01 – Đăng nhập Employee

**Precondition:** Tài khoản Employee hợp lệ.

**Test Steps:**

1. Mở màn hình đăng nhập.
2. Nhập thông tin Employee.
3. Nhấn đăng nhập.

**Expected Result:**

- Employee đăng nhập thành công.
- Hệ thống chuyển đến khu vực Employee.

---

## TC-EMP-02 – Employee không có quyền truy cập khu vực Owner

**Precondition:** Tài khoản đăng nhập có quyền Employee.

**Test Steps:**

1. Đăng nhập bằng tài khoản Employee.
2. Truy cập chức năng dành riêng cho Owner.

**Expected Result:**

- Hệ thống từ chối truy cập.
- Employee không thể thực hiện thao tác quản trị.

---

## TC-EMP-03 – Xem danh sách đơn hàng

**Precondition:** Hệ thống có đơn hàng.

**Test Steps:**

1. Employee đăng nhập.
2. Mở chức năng quản lý đơn hàng.

**Expected Result:**

- Danh sách đơn hàng được hiển thị.
- Employee có thể xem thông tin đơn cần xử lý.

---

## TC-EMP-04 – Xác nhận đơn hàng

**Precondition:** Có đơn hàng ở trạng thái PENDING.

**Test Steps:**

1. Mở danh sách đơn hàng.
2. Chọn đơn PENDING.
3. Chọn xác nhận đơn.

**Expected Result:**

- Đơn hàng chuyển sang trạng thái CONFIRMED.
- Hệ thống lưu trạng thái mới.

---

## TC-EMP-05 – Từ chối đơn hàng

**Precondition:** Có đơn hàng có thể bị từ chối.

**Test Steps:**

1. Chọn đơn hàng.
2. Chọn chức năng từ chối.
3. Xác nhận thao tác.

**Expected Result:**

- Đơn hàng chuyển sang trạng thái REJECTED.
- Hệ thống lưu trạng thái mới.

---

## TC-EMP-06 – Cập nhật trạng thái chuẩn bị món

**Precondition:** Đơn hàng đã được xác nhận.

**Test Steps:**

1. Mở đơn hàng CONFIRMED.
2. Bắt đầu chuẩn bị món.
3. Cập nhật trạng thái.

**Expected Result:**

- Đơn hàng chuyển sang PREPARING.
- Trạng thái được lưu chính xác.

---

## TC-EMP-07 – Cập nhật đơn sang READY

**Precondition:** Đơn hàng đang ở trạng thái PREPARING.

**Test Steps:**

1. Mở đơn hàng.
2. Xác nhận món đã chuẩn bị xong.
3. Cập nhật trạng thái READY.

**Expected Result:**

- Đơn hàng chuyển sang READY.
- Customer có thể theo dõi trạng thái mới.

---

## TC-EMP-08 – Hoàn tất đơn hàng

**Precondition:** Đơn hàng ở trạng thái READY.

**Test Steps:**

1. Employee mở đơn hàng.
2. Xác nhận đã giao món.
3. Cập nhật hoàn tất đơn.

**Expected Result:**

- Đơn hàng chuyển sang COMPLETED.
- Hệ thống lưu trạng thái hoàn tất.

---

## TC-EMP-09 – Chấm công

**Precondition:** Employee đã đăng nhập.

**Test Steps:**

1. Mở chức năng chấm công.
2. Thực hiện chấm công.

**Expected Result:**

- Hệ thống ghi nhận thời gian chấm công.
- Thông tin chấm công được lưu.

---

## TC-EMP-10 – Xem ca làm

**Precondition:** Employee có ca làm được phân công.

**Test Steps:**

1. Mở chức năng ca làm.
2. Xem lịch làm việc.

**Expected Result:**

- Hệ thống hiển thị ca làm.
- Thông tin ca làm chính xác.

---

## TC-EMP-11 – Chat với Customer

**Precondition:** Có cuộc hội thoại với Customer.

**Test Steps:**

1. Mở chức năng chat.
2. Chọn cuộc hội thoại.
3. Nhập nội dung phản hồi.
4. Gửi tin nhắn.

**Expected Result:**

- Tin nhắn được gửi.
- Customer có thể nhận được phản hồi.
- Nội dung hội thoại được lưu.

---

# 4. Owner Test Cases

## TC-OWN-01 – Đăng nhập Owner

**Precondition:** Tài khoản Owner hợp lệ.

**Test Steps:**

1. Mở màn hình đăng nhập.
2. Nhập thông tin Owner.
3. Nhấn đăng nhập.

**Expected Result:**

- Owner đăng nhập thành công.
- Hệ thống hiển thị khu vực quản trị.

---

## TC-OWN-02 – Xem Dashboard

**Precondition:** Owner đã đăng nhập.

**Test Steps:**

1. Truy cập Dashboard.

**Expected Result:**

- Dashboard được hiển thị.
- Các thông tin tổng quan được tải thành công.

---

## TC-OWN-03 – Xem danh sách nhân viên

**Precondition:** Owner đã đăng nhập.

**Test Steps:**

1. Mở chức năng quản lý nhân viên.

**Expected Result:**

- Danh sách Employee được hiển thị.
- Owner có thể xem thông tin nhân viên.

---

## TC-OWN-04 – Thêm nhân viên

**Precondition:** Owner có quyền quản lý nhân viên.

**Test Steps:**

1. Mở quản lý nhân viên.
2. Chọn thêm nhân viên.
3. Nhập thông tin hợp lệ.
4. Lưu thông tin.

**Expected Result:**

- Nhân viên mới được tạo.
- Nhân viên xuất hiện trong danh sách.

---

## TC-OWN-05 – Cập nhật thông tin nhân viên

**Precondition:** Nhân viên tồn tại.

**Test Steps:**

1. Chọn nhân viên.
2. Chọn chỉnh sửa.
3. Thay đổi thông tin.
4. Lưu.

**Expected Result:**

- Thông tin nhân viên được cập nhật.
- Dữ liệu mới được hiển thị chính xác.

---

## TC-OWN-06 – Quản lý khách hàng

**Precondition:** Owner đã đăng nhập.

**Test Steps:**

1. Mở chức năng quản lý Customer.
2. Chọn một tài khoản.

**Expected Result:**

- Thông tin Customer được hiển thị.
- Owner có thể thực hiện các thao tác được cấp quyền.

---

## TC-OWN-07 – Phân quyền tài khoản

**Precondition:** Owner có quyền quản trị.

**Test Steps:**

1. Mở chức năng phân quyền.
2. Chọn tài khoản.
3. Thiết lập quyền.
4. Lưu thay đổi.

**Expected Result:**

- Quyền được cập nhật thành công.
- Tài khoản chỉ truy cập được các chức năng phù hợp với quyền mới.

---

## TC-OWN-08 – Thêm món ăn

**Precondition:** Owner đã đăng nhập.

**Test Steps:**

1. Mở quản lý thực đơn.
2. Chọn thêm món.
3. Nhập thông tin món.
4. Lưu.

**Expected Result:**

- Món ăn được tạo thành công.
- Món xuất hiện trong danh sách thực đơn.

---

## TC-OWN-09 – Cập nhật món ăn

**Precondition:** Món ăn tồn tại.

**Test Steps:**

1. Chọn món.
2. Chọn chỉnh sửa.
3. Thay đổi thông tin.
4. Lưu.

**Expected Result:**

- Thông tin món được cập nhật.
- Giá và trạng thái mới được hiển thị chính xác.

---

## TC-OWN-10 – Quản lý kho

**Precondition:** Có dữ liệu nguyên liệu.

**Test Steps:**

1. Mở chức năng quản lý kho.
2. Chọn nguyên liệu.
3. Xem hoặc cập nhật số lượng.

**Expected Result:**

- Thông tin tồn kho được hiển thị.
- Dữ liệu được cập nhật chính xác khi thay đổi hợp lệ.

---

## TC-OWN-11 – Tạo voucher

**Precondition:** Owner có quyền quản lý voucher.

**Test Steps:**

1. Mở quản lý voucher.
2. Chọn tạo voucher.
3. Nhập thông tin hợp lệ.
4. Lưu voucher.

**Expected Result:**

- Voucher được tạo thành công.
- Voucher xuất hiện trong danh sách.

---

## TC-OWN-12 – Xem ca làm và chấm công

**Precondition:** Có dữ liệu ca làm và chấm công.

**Test Steps:**

1. Mở chức năng ca làm.
2. Xem danh sách ca.
3. Xem dữ liệu chấm công.

**Expected Result:**

- Ca làm được hiển thị.
- Dữ liệu chấm công được hiển thị chính xác.

---

## TC-OWN-13 – Xem dữ liệu tài chính

**Precondition:** Hệ thống có dữ liệu giao dịch.

**Test Steps:**

1. Mở chức năng tài chính.
2. Chọn khoảng thời gian nếu có.
3. Xem dữ liệu.

**Expected Result:**

- Dữ liệu tài chính được hiển thị.
- Doanh thu được tổng hợp từ dữ liệu hệ thống.

---

## TC-OWN-14 – Tạo báo cáo

**Precondition:** Hệ thống có dữ liệu.

**Test Steps:**

1. Mở chức năng báo cáo.
2. Chọn loại báo cáo.
3. Chọn khoảng thời gian.
4. Thực hiện tạo báo cáo.

**Expected Result:**

- Hệ thống tổng hợp dữ liệu.
- Báo cáo được hiển thị.
- Kết quả phù hợp với dữ liệu đã có.

---

## TC-OWN-15 – Backup dữ liệu

**Precondition:** Owner có quyền Backup.

**Test Steps:**

1. Mở chức năng Backup.
2. Thực hiện Backup.

**Expected Result:**

- Hệ thống tạo dữ liệu Backup.
- Hệ thống thông báo kết quả Backup.

---

## TC-OWN-16 – Restore dữ liệu

**Precondition:** Có dữ liệu Backup hợp lệ.

**Test Steps:**

1. Mở chức năng Restore.
2. Chọn dữ liệu Backup.
3. Xác nhận Restore.

**Expected Result:**

- Hệ thống kiểm tra dữ liệu Backup.
- Dữ liệu được khôi phục nếu hợp lệ.
- Hệ thống thông báo kết quả Restore.

---

# 5. Security & Permission Test Cases

## TC-SEC-01 – Customer truy cập chức năng Owner

**Precondition:** Người dùng đăng nhập với quyền Customer.

**Test Steps:**

1. Đăng nhập bằng Customer.
2. Truy cập URL hoặc chức năng dành cho Owner.

**Expected Result:**

- Hệ thống từ chối truy cập.
- Customer không thể thực hiện thao tác quản trị.

---

## TC-SEC-02 – Employee truy cập chức năng Owner

**Precondition:** Người dùng đăng nhập với quyền Employee.

**Test Steps:**

1. Đăng nhập bằng Employee.
2. Truy cập chức năng dành riêng cho Owner.

**Expected Result:**

- Hệ thống từ chối truy cập.
- Employee không thể thực hiện thao tác quản trị.

---

## TC-SEC-03 – Truy cập chức năng khi chưa đăng nhập

**Precondition:** Người dùng chưa đăng nhập.

**Test Steps:**

1. Truy cập chức năng yêu cầu đăng nhập.

**Expected Result:**

- Hệ thống yêu cầu đăng nhập.
- Người dùng chưa xác thực không được truy cập dữ liệu yêu cầu quyền.

---

# 6. Tổng hợp Test Cases

| Nhóm | Số lượng |
|---|---:|
| Customer | 20 |
| Employee | 11 |
| Owner | 16 |
| Security & Permission | 3 |
| **Tổng cộng** | **50** |

---

# 7. Quy ước kết quả kiểm thử

- **PASS**: Chức năng hoạt động đúng với Expected Result.
- **FAIL**: Chức năng không đáp ứng Expected Result.
- **BLOCKED**: Không thể thực hiện kiểm thử do thiếu điều kiện hoặc môi trường.
- Test case phải được thực hiện lại sau khi sửa lỗi liên quan.