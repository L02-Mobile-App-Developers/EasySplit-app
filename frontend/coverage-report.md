# Báo cáo Test Coverage — Frontend

**Ngày chạy:** 2026-05-24  
**Lệnh:** `npm run test:coverage`  
**Kết quả:** 21 suites passed · 65 tests passed

---

## Tổng quan

| Chỉ số | Giá trị | Ngưỡng CI |
|--------|--------|-----------|
| Statements | **98.17%** (215/219) | ≥ 70% ✅ |
| Branches | **86.04%** (37/43) | ≥ 70% ✅ |
| Functions | **100%** (86/86) | ≥ 70% ✅ |
| Lines | **98.08%** (205/209) | ≥ 70% ✅ |

## Coverage theo nhóm

| Nhóm | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| `api/` | 100% | 87.5% | 100% | 100% |
| `api/services/` | 98.94% | 81.25% | 100% | 98.94% |
| `api/storage/` | 90% | 92.85% | 100% | 89.28% |
| `store/` | 100% | 100% | 100% | 100% |
| `hooks/` | 100% | 75% | 100% | 100% |
| `components/` | 100% | 100% | 100% | 100% |
| `constants/` | 100% | 100% | 100% | 100% |
| `services/` | 100% | 100% | 100% | 100% |

## File chưa cover đầy đủ

| File | Uncovered |
|------|-----------|
| `api/services/activity.service.ts` | Dòng 39 |
| `api/storage/token.storage.ts` | Dòng 22–24 |
| `api/client.ts` | Branch dòng 29 (reject không phải 401) |
| `hooks/use-theme-color.ts` | Branch `?? "light"` |

## Loại test

- **Unit:** API services, client, endpoints, token storage, constants
- **Component:** ThemedText, LoadingScreen
- **Store:** auth.store
- **Hooks:** useAuth, useAppTheme, use-theme-color
- **Integration:** auth-flow (login → fetchMe)

## HTML report

Sau khi chạy coverage: mở `frontend/coverage/lcov-report/index.html`

## Báo cáo tổng hợp

Xem [docs/test-coverage-report.md](../docs/test-coverage-report.md) (Frontend + Backend).
