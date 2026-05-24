# Báo cáo Test Coverage — Backend

**Ngày chạy:** 2026-05-24  
**Lệnh:** `npx jest --coverage --colors=never tests/unit`  
**Kết quả:** 13 suites passed · 83 tests passed

---

## Tổng quan

| Chỉ số | Giá trị |
|--------|--------|
| Statements | **80.02%** |
| Branches | **65.97%** |
| Functions | **79.60%** |
| Lines | **79.83%** |

## Chi tiết theo module

| Module | Stmts | Branch | Funcs | Lines | Uncovered (tóm tắt) |
|--------|-------|--------|-------|-------|---------------------|
| activity | 89.13% | 81.08% | 77.77% | 88.63% | 45, 77, 97, 107, 111 |
| auth | 76.71% | 64.28% | 100% | 76.71% | 50, 99, 170, 213–248 |
| balance | 72.22% | 100% | 60% | 76.47% | 17–28 |
| expense | 87.20% | 70.32% | 84.61% | 87.57% | transaction, validation paths |
| friend | 96.49% | 81.81% | 100% | 100% | branches 45–83 |
| group | 76.72% | 60.00% | 85.71% | 76.72% | role/member edge cases |
| reminder | 85.24% | 64.28% | 63.63% | 84.74% | 84–172 |
| **settlement** | **66.84%** | **53.33%** | 70% | **66.10%** | smart settle, group settlement |
| user | 78.12% | 60.00% | 71.42% | 78.12% | 23, 37, 50–57, 73, 104 |
| users | 100% | 71.42% | 100% | 100% | branches 3, 11–12 |

## Test suites (`tests/unit/modules/`)

| File test | Module |
|-----------|--------|
| `auth/auth.service.test.ts` | auth |
| `user/user.service.test.ts` | user |
| `users/users.service.test.ts` | users |
| `friend/friend.service.test.ts` | friend |
| `group/group.service.test.ts` | group |
| `expense/expense.validation.test.ts` | expense |
| `expense/expense.split.test.ts` | expense |
| `expense/expense.transaction.test.ts` | expense |
| `expense/expense.crud.test.ts` | expense |
| `balance/balance.service.test.ts` | balance |
| `settlement/settlement.service.test.ts` | settlement |
| `reminder/reminder.service.test.ts` | reminder |
| `activity/activity.service.test.ts` | activity |

## Ưu tiên cải thiện

1. **`settlement.service.ts`** — coverage thấp nhất; thêm test smart settle, commit, audit.
2. **`group.service.ts`** — branches 60%; test đổi role / xóa member.
3. **`auth.service.ts`** — Firebase token, `DEV_AUTH_ENABLED`.

## HTML report

Sau khi chạy coverage: mở `backend/coverage/lcov-report/index.html`

## Báo cáo tổng hợp

Xem [docs/test-coverage-report.md](../docs/test-coverage-report.md) (Frontend + Backend).
