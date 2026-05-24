# EasySplit API - Endpoint Documentation

## 1. Tổng quan

EasySplit API cung cấp hệ thống quản lý chi tiêu nhóm, bao gồm:

- Quản lý user & subscription
- Quản lý group & member
- Quản lý expense (chi tiêu)
- Tính toán balance & debt
- Smart settle & group settlement
- Reminder & lịch sử hoạt động

Base URL: /api/v1

---

## 2. Auth APIs

### POST `/auth/login`

Đăng nhập hệ thống

### POST `/auth/register`

Đăng ký tài khoản mới

### POST `/auth/refresh-token`

Làm mới access token

### POST `/auth/logout`

Đăng xuất và invalidate token

### POST `/auth/sync`

Đồng bộ user từ client (mobile cache / offline sync)

---

## 3. User (Me APIs)

### GET `/me`

Lấy thông tin user hiện tại

### PATCH `/me`

Cập nhật profile:

- displayName
- avatarUrl

---

### GET `/me/subscription`

Lấy thông tin subscription của user:

- plan (free / premium)
- status
- current period

👉 Dùng để kiểm tra quyền premium

---

### GET `/me/usage`

Thống kê usage:

- số group đang tham gia
- số lần smart settle đã dùng trong tháng
- quota free tier

---

## 4. Group APIs

### POST `/groups`

Tạo group mới

### GET `/groups`

Lấy danh sách group của user

### GET `/groups/:groupId`

Lấy chi tiết group

### PATCH `/groups/:groupId`

Cập nhật group

### POST `/groups/:groupId/close`

Đóng group (chỉ owner/admin)

---

## 5. Group Members

### GET `/groups/:groupId/members`

Danh sách thành viên group

### POST `/groups/:groupId/members`

Thêm member vào group

### PATCH `/groups/:groupId/members/:userId`

Cập nhật role member

### DELETE `/groups/:groupId/members/:userId`

Xoá member khỏi group

---

## 6. Expenses (Chi tiêu)

### POST `/groups/:groupId/expenses`

Tạo expense mới

Rules:

- phải có payer
- participants không rỗng
- splitMode: equal | amount | percent | weight
- update balance tự động

---

### GET `/groups/:groupId/expenses`

Danh sách expenses trong group

### GET `/groups/:groupId/expenses/:expenseId`

Chi tiết expense

### PATCH `/groups/:groupId/expenses/:expenseId`

Cập nhật expense

### DELETE `/groups/:groupId/expenses/:expenseId`

Xoá expense và rollback balance

---

## 7. Balance & Debt

### GET `/groups/:groupId/balances`

Xem balance tất cả member

### GET `/groups/:groupId/balances/me`

Xem balance của user hiện tại

---

### GET `/groups/:groupId/debts`

Trả về debt graph:

- ai nợ ai
- amount

---

## 8. Smart Settle

### POST `/groups/:groupId/smart-settle/suggestions`

Tạo đề xuất tối ưu trả nợ

Rules:

- Free: giới hạn số lần/tháng
- Premium: không giới hạn
- không ghi DB

Output:

- danh sách transfer tối ưu

---

## 9. Settlements

### POST `/groups/:groupId/settlements`

Tạo settlement (trả nợ thủ công)

### GET `/groups/:groupId/settlements`

Lịch sử settlement

### GET `/groups/:groupId/settlements/:settlementId`

Chi tiết settlement

---

## 10. Group Settlement (Premium)

### POST `/groups/:groupId/group-settlement`

Chốt toàn bộ nợ trong group

Modes:

- `simulate` → chỉ preview
- `commit` → ghi dữ liệu thật

Rules:

- chỉ Premium group mới được dùng
- commit cần idempotency key

---

## 11. Reminders (Premium)

### POST `/groups/:groupId/reminders`

Gửi nhắc nợ cho user

Rules:

- chỉ gửi cho user đang có debt
- chống duplicate trong 24h

---

### GET `/groups/:groupId/reminders`

Danh sách reminder

### POST `/groups/:groupId/reminders/:reminderId/cancel`

Huỷ reminder

---

## 12. Activities & History

### GET `/groups/:groupId/activities`

Timeline hoạt động trong group

### GET `/groups/:groupId/history`

Lịch sử tài chính tổng hợp

Query:

- page, limit
- from, to
- actorId
- type

Free tier giới hạn 90 ngày

---

## 13. Internal APIs (Backend only)

### POST `/internal/groups/:groupId/ledger/rebuild`

Rebuild toàn bộ balance từ expense + settlement

👉 dùng cho:

- debug
- repair data
- audit

Không expose cho client

---

## 14. Entitlement Rules

### Free

- tối đa 3 groups
- smart settle 3 lần/tháng
- history 90 ngày

### Premium

- unlimited smart settle
- group settlement
- reminders
- full history

---

## 15. Core Business Rules

- Tổng balance group luôn = 0
- Mọi transaction phải dùng DB transaction
- Expense update phải rollback/rebuild ledger
- Smart settle không modify DB
- Settlement luôn deterministic
- Idempotency bắt buộc cho POST financial APIs

---

## 16. API Philosophy

- RESTful design
- Stateless authentication
- Audit log mọi hành động tài chính
- Safety-first (no silent overwrite data)
