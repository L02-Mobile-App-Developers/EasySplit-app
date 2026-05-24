# Báo cáo Test Coverage — EasySplit

**Ngày chạy:** 2026-05-24  
**Dự án:** EasySplit (Frontend Expo + Backend Express)  
**Mục tiêu coverage:** ≥ 70% (Frontend CI bắt buộc); Backend ~80% statements (khuyến nghị nội bộ)

---

## 1. Tóm tắt điều hành

| Thành phần | Test suites | Tests | Statements | Branches | Functions | Lines | Đạt ngưỡng 70% |
|------------|-------------|-------|------------|----------|-----------|-------|----------------|
| **Frontend** | 21 / 21 ✅ | 65 / 65 ✅ | **98.17%** | **86.04%** | **100%** | **98.08%** | ✅ Có |
| **Backend** | 13 / 13 ✅ | 83 / 83 ✅ | **80.02%** | **65.97%** | **79.60%** | **79.83%** | ✅ Statements/Lines/Functions; ⚠️ Branches |

**Kết luận ngắn**

- Frontend: coverage logic nghiệp vụ (API, store, hooks) rất cao; CI fail nếu dưới 70% mọi chỉ số.
- Backend: đạt ~80% statements; **settlement** và **branch coverage** là điểm cần cải thiện tiếp.
- Màn hình Expo (`app/`) chưa nằm trong phạm vi coverage frontend (chủ ý — tránh mock router nặng).

---

## 2. Lệnh tái tạo báo cáo

### Frontend

```bash
cd frontend
npm run test:coverage
# Báo cáo HTML/LCOV: frontend/coverage/lcov-report/index.html
```

### Backend

```bash
cd backend
npx jest --coverage --colors=never tests/unit
# Báo cáo HTML/LCOV: backend/coverage/lcov-report/index.html
```

### CI (GitHub Actions)

| Workflow | Lệnh |
|----------|------|
| `frontend-test.yml` | `npm run test:ci` |
| `backend-test.yml` | `npm run lint` → `npm test` → `npm run build` |

---

## 3. Frontend — chi tiết

### 3.1 Cấu hình

| Mục | Giá trị |
|-----|---------|
| Runner | Jest 29 + `jest-expo` |
| Setup | `jest.setup.ts` (AsyncStorage mock, uuid, crypto) |
| Ngưỡng CI | 70% (statements, branches, functions, lines) |
| Phạm vi đo | `api/`, `store/`, hooks chọn lọc, `ThemedText`, `LoadingScreen`, `constants/` |
| Loại trừ | `api/types/**`, `api/groupApi.ts`, toàn bộ `app/**` |

### 3.2 Tổng quan coverage

| Chỉ số | Covered | Total | % |
|--------|---------|-------|---|
| Statements | 215 | 219 | **98.17%** |
| Branches | 37 | 43 | **86.04%** |
| Functions | 86 | 86 | **100%** |
| Lines | 205 | 209 | **98.08%** |

### 3.3 Coverage theo file

| File | Stmts | Branch | Funcs | Lines | Dòng chưa cover |
|------|-------|--------|-------|-------|-----------------|
| `api/client.ts` | 100% | 83.33% | 100% | 100% | — |
| `api/endpoints.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/auth.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/group.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/expense.service.ts` | 100% | 0%* | 100% | 100% | default params (34) |
| `api/services/balance.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/settlement.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/friend.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/me.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/reminder.service.ts` | 100% | 100% | 100% | 100% | — |
| `api/services/activity.service.ts` | 88.88% | 75% | 100% | 88.88% | 39 |
| `api/storage/token.storage.ts` | 90% | 92.85% | 100% | 89.28% | 22–24 (catch web setItem) |
| `store/auth.store.ts` | 100% | 100% | 100% | 100% | — |
| `hooks/useAuth.ts` | 100% | 100% | 100% | 100% | — |
| `hooks/useAppTheme.ts` | 100% | 100% | 100% | 100% | — |
| `hooks/use-theme-color.ts` | 100% | 75% | 100% | 100% | nhánh `?? "light"` (13) |
| `components/ThemedText.tsx` | 100% | 100% | 100% | 100% | — |
| `services/LoadingScreen.tsx` | 100% | 100% | 100% | 100% | — |
| `constants/colors.ts` | 100% | 100% | 100% | 100% | — |
| `constants/fonts.ts` | 100% | 100% | 100% | 100% | — |

\* Branch 0% trên `expense.service.ts` do tham số mặc định `page`/`limit` — statements/lines vẫn 100%.

### 3.4 Phân loại test (65 tests)

| Loại | Số file test | Mô tả |
|------|--------------|--------|
| **Unit — API services** | 9 | Mock `apiClient`, kiểm tra URL/method/payload |
| **Unit — API core** | 3 | `client` interceptors, `endpoints`, `token.storage` |
| **Unit — Store** | 1 | `auth.store` (login, register, fetchMe, logout) |
| **Unit — Hooks** | 3 | `useAuth`, `useAppTheme`, `use-theme-color` |
| **Unit — Constants** | 2 | `colors`, `fonts` |
| **Component** | 2 | `ThemedText`, `LoadingScreen` |
| **Integration** | 1 | Login → `fetchMe` giữ session |

**Danh sách file test**

```
frontend/__tests__/
├── components/ThemedText.test.tsx
├── constants/colors.test.ts, fonts.test.ts
├── hooks/useAuth.test.tsx, useAppTheme.test.tsx, use-theme-color.test.tsx
├── integration/auth-flow.test.ts
├── loadingScreen.test.tsx
├── store/auth.store.test.ts
└── unit/api/
    ├── client.test.ts, endpoints.test.ts
    ├── storage/token.storage.test.ts
    └── services/
        ├── activity, auth, balance, expense, friend,
        ├── group, me, reminder, settlement.service.test.ts
```

### 3.5 Ngoài phạm vi coverage (chưa đo)

- Toàn bộ `frontend/app/**` (màn hình Expo Router)
- `TopAppBar`, `navigationBar`, `header`
- `use-color-scheme.ts` / `.web.ts` (re-export platform)

### 3.6 Khuyến nghị frontend

1. Thêm test cho `getHistory` nhánh meta đầy đủ (`activity.service` dòng 39).
2. Cover catch block `token.storage` khi `localStorage.setItem` lỗi (dòng 22–24).
3. (Tùy chọn) Screen tests với mock `expo-router` cho luồng login → danh sách nhóm.

---

## 4. Backend — chi tiết

### 4.1 Cấu hình

| Mục | Giá trị |
|-----|---------|
| Runner | Jest 29 + `ts-jest` |
| Phạm vi | `tests/unit` — module services |
| Pattern | Mock Firestore transaction / `firestore-db` |

### 4.2 Tổng quan coverage

| Chỉ số | % |
|--------|---|
| Statements | **80.02%** |
| Branches | **65.97%** |
| Functions | **79.60%** |
| Lines | **79.83%** |

### 4.3 Coverage theo module

| Module | File | Stmts | Branch | Funcs | Lines | Ghi chú |
|--------|------|-------|--------|-------|-------|---------|
| activity | `activity.service.ts` | 89.13% | 81.08% | 77.77% | 88.63% | Dòng 45, 77, 97, 107, 111 |
| auth | `auth.service.ts` | 76.71% | 64.28% | 100% | 76.71% | JWT/Firebase nhánh dev |
| balance | `balance.service.ts` | 72.22% | 100% | 60% | 76.47% | Dòng 17–28 |
| expense | `expense.service.ts` | 87.20% | 70.32% | 84.61% | 87.57% | Transaction + validation |
| friend | `friend.service.ts` | 96.49% | 81.81% | 100% | 100% | Dòng 45–83 (branches) |
| group | `group.service.ts` | 76.72% | 60.00% | 85.71% | 76.72% | Role/member edge cases |
| reminder | `reminder.service.ts` | 85.24% | 64.28% | 63.63% | 84.74% | Dòng 84–172 |
| settlement | `settlement.service.ts` | **66.84%** | **53.33%** | 70% | **66.10%** | **Ưu tiên cao** |
| user | `user.service.ts` | 78.12% | 60.00% | 71.42% | 78.12% | Profile CRUD |
| users | `users.service.ts` | 100% | 71.42% | 100% | 100% | Search users |

### 4.4 Phân loại test (83 tests)

| File test | Module | Số test (ước lượng) | Trọng tâm |
|-----------|--------|---------------------|-----------|
| `auth.service.test.ts` | auth | — | Login, register, refresh |
| `user.service.test.ts` | user | — | Profile |
| `users.service.test.ts` | users | — | Search |
| `friend.service.test.ts` | friend | — | Kết bạn |
| `group.service.test.ts` | group | — | Nhóm, members |
| `expense.validation.test.ts` | expense | — | Zod / split validation |
| `expense.split.test.ts` | expense | — | Chia bill |
| `expense.transaction.test.ts` | expense | — | Firestore transaction |
| `expense.crud.test.ts` | expense | — | CRUD flows |
| `balance.service.test.ts` | balance | — | Số dư |
| `settlement.service.test.ts` | settlement | — | Settlement cơ bản |
| `reminder.service.test.ts` | reminder | — | Nhắc nhở |
| `activity.service.test.ts` | activity | — | Audit log |

### 4.5 Module cần ưu tiên (backend)

| Ưu tiên | Module | Lý do |
|---------|--------|--------|
| 🔴 Cao | `settlement.service.ts` | Thấp nhất (~67% stmts, ~53% branches); smart settle, group settlement, commit |
| 🟠 Trung bình | `group.service.ts` | 60% branches — đổi role, remove member |
| 🟠 Trung bình | `auth.service.ts` | Firebase sync, production guard |
| 🟡 Thấp | `balance.service.ts` | 60% functions — helper chưa gọi trong test |

### 4.6 Khuyến nghị backend

1. Bổ sung test `settlement`: `generateSmartSettle`, `groupSettlement` (simulate/commit), idempotency failure.
2. Test `auth.service` với `DEV_AUTH_ENABLED` và header `X-User-Id`.
3. Cân nhắc `coverageThreshold` trong `jest.config.js` (ví dụ 75% statements) khi settlement được cover tốt hơn.

---

## 5. So sánh Frontend vs Backend

```
Statements (%)
Frontend  ████████████████████████████████████████  98.17
Backend   ████████████████████████████████░░░░░░░░  80.02

Branches (%)
Frontend  ██████████████████████████████████░░░░░░  86.04
Backend   ██████████████████████████░░░░░░░░░░░░░░  65.97
```

| Tiêu chí | Frontend | Backend |
|----------|----------|---------|
| Độ rộng test (layers) | API + store + hooks + component | Chủ yếu service layer |
| Độ sâu integration | 1 flow auth | Transaction mocks Firestore |
| CI coverage gate | Có (70%) | Chưa (chỉ lint + test + build) |
| Điểm yếu chính | UI screens chưa test | settlement + branches |

---

## 6. Tài liệu liên quan

| File | Mô tả |
|------|--------|
| [frontend/coverage-report.md](../frontend/coverage-report.md) | Bản tóm tắt frontend |
| [backend/coverage-report.md](../backend/coverage-report.md) | Bản tóm tắt backend |
| [frontend/coverage/lcov-report/index.html](../frontend/coverage/lcov-report/index.html) | HTML coverage (sau khi chạy test) |
| [backend/coverage/lcov-report/index.html](../backend/coverage/lcov-report/index.html) | HTML coverage (sau khi chạy test) |

---

*Báo cáo được tạo từ kết quả `jest --coverage` trên môi trường local. Cập nhật lại bằng các lệnh ở mục 2 khi có thay đổi test hoặc mã nguồn.*
