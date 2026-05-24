# Backend API Spec - EasySplit

## 1. Muc tieu

Tai lieu nay dinh nghia toan bo hop dong API backend cho EasySplit, bao gom:

- Luong Free de on-boarding nhanh
- Luong Premium cho nhu cau su dung nhom thuong xuyen
- Quy tac nghiep vu tinh no, settle no, chot nhom
- Quy tac entitlement theo goi Free/Premium

Doi tuong su dung: Backend, Mobile, QA, Product.

---

## 2. Nguyen tac he thong

- API theo REST, version qua prefix `/api/v1`.
- Moi thao tac tai chinh phai deterministic va co the truy vet.
- Tong so du rong cua mot group luon bang 0.
- Tat ca endpoint ghi du lieu tai chinh phai chay trong transaction.
- Khong cho phep thao tac premium neu khong du entitlement.

---

## 3. Base URL va Auth

### 3.1 Base URL

- Dev: `http://localhost:8080/api/v1`
- Stage: `https://staging-api.easysplit.app/api/v1`
- Prod: `https://api.easysplit.app/api/v1`

### 3.2 Authentication

- Prod/Stage: `Authorization: Bearer <jwt>`
- Dev local (optional): `X-User-Id: <uuid>`

### 3.3 Authorization

- User phai la member moi truy cap du lieu group.
- Cac thao tac nhay cam (xoa member, dong group, sua/xoa expense) yeu cau owner hoac creator theo rule tung endpoint.

---

## 4. Quy uoc chung

### 4.1 Content type

- Request/Response: `application/json`

### 4.2 Time

- ISO 8601 UTC, vi du: `2026-04-23T10:30:00Z`

### 4.3 Money

- `amount` la so nguyen (VND), khong dung so thuc.

### 4.4 Pagination

Query params:

- `page` (default `1`)
- `limit` (default `20`, max `100`)

### 4.5 Idempotency (khuyen nghi)

Cho endpoint POST tai chinh:

- Header `Idempotency-Key: <uuid>`
- Neu key trung trong cua so 24h, tra lai ket qua cu.

---

## 5. Chuan response

### 5.1 Success

```json
{
  "data": {},
  "meta": {},
  "message": "OK"
}
```

### 5.2 Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be greater than 0",
    "details": [
      {
        "field": "amount",
        "issue": "must be positive"
      }
    ]
  }
}
```

### 5.3 Error codes

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `VALIDATION_ERROR`
- `PREMIUM_REQUIRED`
- `FREE_QUOTA_EXCEEDED`
- `IDEMPOTENCY_CONFLICT`
- `INTERNAL_SERVER_ERROR`

---

## 6. Data model cot loi

### 6.1 User

```json
{
  "id": "uuid",
  "displayName": "string",
  "email": "string",
  "avatarUrl": "string|null",
  "createdAt": "datetime"
}
```

### 6.2 Subscription

```json
{
  "plan": "free|premium",
  "status": "trialing|active|grace_period|canceled|expired",
  "currentPeriodStart": "datetime|null",
  "currentPeriodEnd": "datetime|null"
}
```

### 6.3 Group

```json
{
  "id": "uuid",
  "name": "string",
  "category": "trip|food|roommate|project|other",
  "ownerId": "uuid",
  "status": "active|closed",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 6.4 GroupMember

```json
{
  "groupId": "uuid",
  "userId": "uuid",
  "role": "owner|admin|member",
  "joinedAt": "datetime",
  "isActive": true
}
```

### 6.5 Expense

```json
{
  "id": "uuid",
  "groupId": "uuid",
  "description": "string",
  "amount": 180000,
  "currency": "VND",
  "paidByUserId": "uuid",
  "splitMode": "equal|amount|percent|weight",
  "participants": [
    {
      "userId": "uuid",
      "value": 60000
    }
  ],
  "createdBy": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 6.6 Balance

```json
{
  "groupId": "uuid",
  "userId": "uuid",
  "balance": 50000
}
```

### 6.7 DebtEdge

```json
{
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "amount": 45000
}
```

### 6.8 Settlement

```json
{
  "id": "uuid",
  "groupId": "uuid",
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "amount": 45000,
  "note": "string|null",
  "createdBy": "uuid",
  "createdAt": "datetime"
}
```

### 6.9 Reminder

```json
{
  "id": "uuid",
  "groupId": "uuid",
  "targetUserId": "uuid",
  "type": "debt_reminder",
  "status": "queued|sent|failed",
  "message": "string",
  "scheduledAt": "datetime",
  "createdBy": "uuid",
  "createdAt": "datetime"
}
```

### 6.10 SmartSettleSuggestion

```json
{
  "groupId": "uuid",
  "transfers": [
    {
      "fromUserId": "uuid",
      "toUserId": "uuid",
      "amount": 30000
    }
  ],
  "totalTransfers": 2,
  "generatedAt": "datetime"
}
```

---

## 7. Entitlement Free/Premium

### 7.1 Chinh sach

- Premium ap theo **owner cua group**.
- Neu owner co premium hop le (`trialing|active|grace_period|canceled` trong han): toan bo member group duoc dung tinh nang premium cua group do.
- `expired`: khoa thao tac premium moi, du lieu cu giu nguyen.

### 7.2 Feature matrix

Free:

- Tao group (gioi han so group)
- Quan ly member
- Them/sua/xoa expense
- Xem balances, debts
- Smart settle gioi han 3 lan/thang/user
- Lich su co ban (gioi han 90 ngay)

Premium:

- Smart settle khong gioi han
- Group settlement (1-click close debt)
- Nhac no thong minh
- Lich su day du, bo loc nang cao
- Khong gioi han so group

### 7.3 Quota mac dinh

- `FREE_MAX_GROUPS = 3` (owner)
- `FREE_SMART_SETTLE_PER_MONTH = 3` (user)
- `FREE_HISTORY_DAYS = 90`

---

## 8. Logic nghiep vu tai chinh

### 8.1 Validation khi tao Expense

- `amount > 0`
- Dung 1 payer
- Participants khong rong
- Payer va participants deu la member active
- Tong shares = amount
- `splitMode` hop le voi bo du lieu dau vao

### 8.2 Cong thuc cap nhat balance

Voi expense tong tien $A$, payer $p$, participant $i$, share $share(i)$:

- `balance(p) += A - share(p)`
- `balance(i) -= share(i)` voi moi $i != p$

Bat bien:

$$
\sum_{m \in group} balance(m) = 0
$$

### 8.3 Settlement thu cong

Tao settlement `X -> Y` so tien `P`:

- `P > 0`
- `balance(X) < 0`
- `balance(Y) > 0`
- `P <= min(abs(balance(X)), balance(Y))`

Cap nhat:

- `balance(X) += P`
- `balance(Y) -= P`

### 8.4 Smart settle

- Sinh de xuat transfer toi uu so giao dich.
- Khong tu dong tru balance neu chua confirm settlement.
- Free bi quota thang, Premium khong quota.

### 8.5 Group settlement (Premium)

- He thong tao loat settlement tu de xuat smart settle.
- Co the chay o che do:
  - `simulate`: chi tra preview
  - `commit`: ghi settlement that

---

## 9. Danh sach API day du

## 9.1 Auth & Me

1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/refresh-token`
4. `POST /auth/logout`
5. `GET /me`
6. `PATCH /me`
7. `GET /me/subscription`
8. `GET /me/usage` (smart settle used, group count)

## 9.2 Group & Member

1. `POST /groups`
2. `GET /groups`
3. `GET /groups/{groupId}`
4. `PATCH /groups/{groupId}`
5. `POST /groups/{groupId}/close` (owner/admin)
6. `GET /groups/{groupId}/members`
7. `POST /groups/{groupId}/members`
8. `PATCH /groups/{groupId}/members/{userId}`
9. `DELETE /groups/{groupId}/members/{userId}`

## 9.3 Expense

1. `POST /groups/{groupId}/expenses`
2. `GET /groups/{groupId}/expenses`
3. `GET /groups/{groupId}/expenses/{expenseId}`
4. `PATCH /groups/{groupId}/expenses/{expenseId}`
5. `DELETE /groups/{groupId}/expenses/{expenseId}`

## 9.4 Balance / Debt / Suggestion

1. `GET /groups/{groupId}/balances`
2. `GET /groups/{groupId}/debts`
3. `POST /groups/{groupId}/smart-settle/suggestions`

## 9.5 Settlement

1. `POST /groups/{groupId}/settlements`
2. `GET /groups/{groupId}/settlements`
3. `POST /groups/{groupId}/group-settlement` (Premium)

## 9.6 Reminder (Premium)

1. `POST /groups/{groupId}/reminders`
2. `GET /groups/{groupId}/reminders`
3. `POST /groups/{groupId}/reminders/{reminderId}/cancel`

## 9.7 Activity / History

1. `GET /groups/{groupId}/activities`
2. `GET /groups/{groupId}/history`

Rule:

- Free: `history` toi da 90 ngay
- Premium: full history + filter nang cao (`from`, `to`, `actorId`, `type`)

---

## 10. Contract chi tiet endpoint quan trong

## 10.1 POST /groups

Tao group moi.

Request:

```json
{
  "name": "Da Lat Trip",
  "category": "trip"
}
```

Validation:

- `name` khong rong, max 80 ky tu
- Neu owner la Free va vuot `FREE_MAX_GROUPS` -> `403 FREE_QUOTA_EXCEEDED`

Response `201`:

```json
{
  "data": {
    "id": "grp_123",
    "name": "Da Lat Trip",
    "ownerId": "usr_1",
    "status": "active"
  },
  "message": "Group created"
}
```

## 10.2 POST /groups/{groupId}/expenses

Tao khoan chi.

Request (split amount):

```json
{
  "description": "An toi",
  "amount": 180000,
  "currency": "VND",
  "paidByUserId": "usr_a",
  "splitMode": "amount",
  "participants": [
    { "userId": "usr_a", "value": 60000 },
    { "userId": "usr_b", "value": 60000 },
    { "userId": "usr_c", "value": 60000 }
  ]
}
```

Response `201`: tra expense + snapshot balance moi.

## 10.3 POST /groups/{groupId}/smart-settle/suggestions

Sinh de xuat ai tra ai.

Request:

```json
{
  "algorithm": "min_transfer",
  "maxTransfers": 50
}
```

Rule:

- Free: neu da dung qua 3 lan/thang -> `403 FREE_QUOTA_EXCEEDED`
- Premium: khong gioi han.

Response `200`:

```json
{
  "data": {
    "transfers": [
      { "fromUserId": "usr_b", "toUserId": "usr_a", "amount": 30000 },
      { "fromUserId": "usr_c", "toUserId": "usr_a", "amount": 20000 }
    ],
    "totalTransfers": 2
  },
  "message": "Suggestion generated"
}
```

## 10.4 POST /groups/{groupId}/group-settlement (Premium)

1 click chot no ca group.

Request:

```json
{
  "mode": "simulate",
  "note": "Ket thuc chuyen di"
}
```

`mode`:

- `simulate`: chi preview
- `commit`: ghi settlements va cap nhat ledger

Neu group khong co entitlement premium -> `403 PREMIUM_REQUIRED`.

## 10.5 POST /groups/{groupId}/reminders (Premium)

Gui nhac no thong minh den user dang no.

Request:

```json
{
  "targetUserIds": ["usr_b", "usr_c"],
  "channel": "in_app",
  "messageTemplate": "ban_dang_no",
  "scheduledAt": "2026-04-24T09:00:00Z"
}
```

Rule:

- Chi nhac user co no > 0
- Khong tao reminder trung lap trong cua so 24h cho cung target + group + template

## 10.6 GET /groups/{groupId}/history

Lay lich su tong hop (expense, settlement, reminder events, member changes).

Query:

- `page`, `limit`
- `from`, `to`
- `actorId`
- `type=expense|settlement|reminder|member|group`

Entitlement:

- Free: neu `from` qua 90 ngay -> cat ve 90 ngay gan nhat
- Premium: khong gioi han thoi gian

---

## 11. Permission matrix tom tat

- Owner:
  - Toan quyen group
  - Co quyen close group va group-settlement
- Admin:
  - Quan ly member (neu policy cho phep)
  - Tao expense, tao settlement, reminder
- Member:
  - Tao expense, xem debt/balance, tao settlement

Khuyen nghi mac dinh don gian:

- Chi owner duoc remove member va close group.

---

## 12. Tinh toan lai ledger (rebuild)

Can endpoint noi bo de QA/ops:

- `POST /internal/groups/{groupId}/ledger/rebuild`

Muc dich:

- Rebuild balance tu expense + settlement theo thu tu thoi gian
- Dung khi sua/xoa expense hoac khoi phuc du lieu

Khong expose cho mobile app.

---

## 13. Audit log va bao mat

Moi thao tac thay doi tai chinh phai ghi:

- `actorUserId`
- `action`
- `entityType`, `entityId`
- `before`, `after`
- `requestId`
- `createdAt`

Bao mat:

- Validate ownership/membership o service layer
- Rate limit endpoint dang nhap, reminder, smart-settle
- Mask thong tin nhay cam trong log

---

## 14. Roadmap API version

- `v1`: Scope hien tai (Free + Premium cot loi)
- `v1.1`: payment webhook, invoice, promo code
- `v2`: multi-currency, recurring expense, split rule templates

---

## 15. Checklist backend implementation

- [ ] Hoan thien middleware auth + membership guard
- [ ] Hoan thien entitlement guard cho premium endpoint
- [ ] Co transaction cho create/update/delete expense va settlement
- [ ] Co idempotency cho endpoint POST tai chinh
- [ ] Co unit test cho split modes + settle algorithm
- [ ] Co integration test cho luong group settlement
- [ ] Co metrics: smart-settle usage, premium conversion, reminder success rate
