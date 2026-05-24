# Báo cáo Test Coverage — Backend

Ngày chạy: 2026-05-24

Tóm tắt lần chạy gần nhất

- Test suites: 13 passed, 13 total
- Tests: 83 passed
- Command chạy: `npx jest --coverage --colors=never`

Tổng quan coverage

- Statements: **80.02%**
- Branches: **65.97%**
- Functions: **79.60%**
- Lines: **79.83%**

Chi tiết theo module (từ báo cáo jest):

- activity: Statements 89.13% | Branches 81.08% | Lines 88.63%
- auth: Statements 76.71% | Branches 64.28% | Lines 76.71%
- balance: Statements 72.22% | Branches 100% | Lines 76.47%
- expense: Statements 87.20% | Branches 70.32% | Lines 87.57%
- friend: Statements 96.49% | Branches 81.81% | Lines 100%
- group: Statements 76.72% | Branches 60.00% | Lines 76.72%
- reminder: Statements 85.24% | Branches 64.28% | Lines 84.74%
- settlement: Statements 66.84% | Branches 53.33% | Lines 66.10%
- user: Statements 78.12% | Branches 60.00% | Lines 78.12%
- users: Statements 100% | Branches 71.42% | Lines 100%

Những khu vực chưa được cover (ưu tiên):

- `src/modules/settlement/settlement.service.ts`
    - Nhiều dòng và nhánh chưa cover (xem báo cáo jest để biết range dòng chính xác). Đây là vùng có ảnh hưởng lớn nhất đến tổng Statements/Branches.
- `src/modules/auth/auth.service.ts`
    - Các nhánh liên quan tới token validation / DEV_AUTH_ENABLED / header override.
- `src/modules/group/group.service.ts`
    - Một số nhánh xung quanh role change, add/remove member edge-cases.

Hành động đã làm lần này

- Thêm file test: `tests/unit/modules/expense/expense.crud.test.ts` (CRUD flows create/get/update/delete được mock transaction), giúp đẩy coverage `expense` lên ~87% và tổng statements lên 80.02%.
- Chạy `npx jest --coverage --colors=never` và lưu kết quả.

Khuyến nghị tiếp theo (để đạt coverage mục tiêu >= 75% statements và cải thiện branch coverage):

1. Tập trung test `settlement.service.ts`:
    - Thêm unit tests cho các nhánh của `generateSmartSettle` (nhiều kịch bản debts), `createSettlement` (validation error, audit log path, transaction failure), và các đường dẫn audit/write khác.
2. Kiểm tra các nhánh ở `auth.service.ts`:
    - Viết test cho: token hợp lệ, token không hợp lệ, `DEV_AUTH_ENABLED` true với header `X-User-Id`, và các lỗi trả về.
3. Thêm một vài test cho `group.service.ts` để cover role changes và member edge-cases.

Gợi ý kỹ thuật cho viết test transaction-heavy (áp dụng lại pattern hiện tại):

- Mock `@/lib/firestore-db` functions: `getDocInTransaction`, `getQueryInTransaction`, `collectionRef(...).firestore.runTransaction` để callback nhận đối tượng transaction có `set`, `delete`, `update` spy.
- Dùng `mockResolvedValueOnce` theo đúng thứ tự các gọi để tránh tiêu thụ nhầm queue.
- Khi assert lỗi, so sánh bằng `error.code` thay vì `instanceof` để tránh vấn đề class identity giữa module/test runtime.

Lệnh tham khảo để chạy lại coverage local:

```bash
cd backend
npx jest --coverage --colors=never
```

Muốn mình làm gì tiếp?

- Mình có thể tiếp tục viết các test cho `settlement.service.ts` (mình sẽ tạo test file và chạy coverage), hoặc
- Mình có thể tạo Pull Request với các thay đổi test hiện tại.

File thay đổi / tạo:

- [backend/tests/unit/modules/expense/expense.crud.test.ts](tests/unit/modules/expense/expense.crud.test.ts)
- [backend/coverage-report.md](coverage-report.md)

-- Kết thúc báo cáo --
