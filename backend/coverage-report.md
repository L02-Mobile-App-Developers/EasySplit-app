# Báo cáo Test Coverage — Backend

**Ngày chạy:** 2026-05-24  
**Lệnh:** `npm run test:coverage` hoặc `npx jest --coverage --colors=never tests/unit`  
**Kết quả:** 13 suites passed · 115 tests passed

---

## Tổng quan

| Chỉ số | Giá trị | Ngưỡng CI |
|--------|--------|-----------|
| Statements | **93.55%** (726/776) | ≥ 70% ✅ |
| Branches | **75.44%** (255/338) | ≥ 70% ✅ |
| Functions | **90.78%** (138/152) | ≥ 70% ✅ |
| Lines | **93.77%** (693/739) | ≥ 70% ✅ |

## Chi tiết theo module

| Module | Stmts | Branch | Funcs | Lines |
|--------|-------|--------|-------|-------|
| activity | ~89% | ~81% | ~78% | ~89% |
| auth | ~77%+ | ~64%+ | 100% | ~77%+ |
| balance | 100% | 100% | 100% | 100% |
| expense | ~87% | ~70%+ | ~85% | ~88% |
| friend | ~96% | ~82% | 100% | 100% |
| group | ~85%+ | ~70%+ | ~86% | ~85%+ |
| reminder | ~95%+ | ~75%+ | ~91% | ~95%+ |
| settlement | ~90%+ | ~70%+ | ~85%+ | ~90%+ |
| user | 100% | ~75%+ | 100% | 100% |
| users | 100% | ~71% | 100% | 100% |

## Test suites (`tests/unit/modules/`)

13 file test — 115 test cases (unit, mock Firestore).

## HTML report

`backend/coverage/index.html`

## Báo cáo tổng hợp

[docs/test-coverage-report.md](../docs/test-coverage-report.md)
