<p align="center">
  <img src="frontend/assets/images/logo-removebg.png" width="100" alt="EasySplit logo" />
</p>

# EasySplit

EasySplit là một ứng dụng quản lý chi tiêu nhóm (mobile) giúp các thành viên trong nhóm dễ dàng:

- Ghi nhận chi phí chung, phân chia theo nhiều chế độ (equal, amount, percent, weight)
- Theo dõi số dư của từng thành viên (balances)
- Tạo và điều hành nhóm, mời bạn bè, quản lý vai trò (owner/admin/member)
- Tạo settlement (đề xuất bù trừ thông minh) và commit giao dịch an toàn (idempotency)
- Nhắc nhở và audit log cho các hoạt động tài chính

Ứng dụng gồm hai phần: frontend (React Native + Expo) và backend (Node.js + Express + Firestore).

---

## Introduction

EasySplit giúp nhóm bạn chia tiền nhanh chóng, minh bạch và có thể truy vết mọi thay đổi (audit). Ứng dụng phù hợp cho nhóm bạn, gia đình, hoặc nhóm du lịch.

## Features

- Tạo nhóm, mời thành viên và phân quyền (owner / admin / member)
- Tạo Expense với nhiều chế độ chia: `equal`, `amount`, `percent`, `weight`
- Tính toán balances tự động sau mỗi thay đổi chi phí
- Đề xuất settlement thông minh (smart settle)
- Hỗ trợ idempotency cho các request tài chính để tránh trùng lặp
- Authentication bằng Firebase Authentication (production) và chế độ dev-auth cho môi trường phát triển
- API theo chuẩn OpenAPI / Postman collection để test tự động

## Tech Stack

- Frontend: React Native, Expo, TypeScript
- Backend: Node.js, TypeScript, Express, firebase-admin
- Database: Cloud Firestore (Google Cloud)
- Auth: Firebase Authentication
- Tests: Jest + ts-jest (backend), Jest/React Testing Library (frontend)
- CI/CD: GitHub Actions (workflows nằm trong `.github/workflows` nếu có)

## System Architecture

Mobile clients (Expo) ⇄ HTTP API (Express) ⇄ Cloud Firestore

```mermaid
graph LR
  Mobile[Mobile App (Expo / React Native)] -->|HTTPS| Backend[Backend (Express, TypeScript)]
  Backend -->|Firestore SDK| Firestore[(Cloud Firestore)]
  Backend -->|Firebase Admin| FirebaseAuth[(Firebase Authentication)]
```

## Project Structure

Top-level folders:

- `backend/` — server-side TypeScript code, tests, config
- `frontend/` — Expo app (React Native), screens, components, assets
- `docs/` — API specs, runbooks
- `postman/` — Postman collection

Thư mục `backend/src` chứa các module chính: `modules/*` (expense, group, settlement, user, auth, ...), `lib/` (helpers), `middleware/`, `routes/`.

## Installation

### Backend

```bash
cd backend
cp .env.example .env   # hoặc tạo .env theo mẫu
npm install
npm run dev            # chạy ở chế độ phát triển
```

### Frontend

```bash
cd frontend
npm install
# Nếu dùng Expo CLI
npx expo start
```

## Environment Variables

Tạo file `.env` trong `backend/` với các biến tối thiểu sau:

- `FIREBASE_SERVICE_ACCOUNT_JSON` hoặc `GOOGLE_APPLICATION_CREDENTIALS` — thông tin service account
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (cần escape newline nếu lưu trực tiếp)
- `FIREBASE_FIRESTORE_DATABASE_ID` (mặc định `(default)`)
- `PORT` (ví dụ `8080`)
- `NODE_ENV` (`development` | `production`)
- `DEV_AUTH_ENABLED` (`true` | `false`) — chỉ cho môi trường phát triển

Frontend environment (ví dụ trong `app.json` hoặc file config):

- `API_BASE_URL` (ví dụ `http://localhost:8080/api/v1`)

## API Documentation

- OpenAPI spec: `docs/openapi.yaml`
- Postman collection: `postman/easysplit.postman_collection.json`

Sử dụng Postman: import collection và set biến `baseUrl`, `firebaseIdToken`, ...

## Deployment

Một số lựa chọn deploy backend:

- Containerize và deploy lên Cloud Run / AWS ECS / DigitalOcean App Platform
- Deploy trực tiếp lên một VPS (PM2, systemd) — đảm bảo biến môi trường và service account

Ví dụ nhanh với Docker (tùy chỉnh Dockerfile riêng):

```bash
# build image
docker build -t easysplit-backend ./backend
# chạy container
docker run -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/key.json -p 8080:8080 easysplit-backend
```

## Testing

### Backend

```bash
cd backend
npm test
# coverage
npx jest --coverage --colors=never
```

### Frontend

```bash
cd frontend
npm test
```

## CI/CD

CI workflow (nếu đã cấu hình) nên chạy các bước:

- install dependencies
- lint
- run unit tests
- run backend coverage (tuỳ yêu cầu)
- build frontend (optional)

Xem folder `.github/workflows` để biết chi tiết workflow nếu có.

## Screenshots

Các ảnh minh hoạ nằm trong `frontend/assets/images/`.

## Contributors

- Dự án: L02-Mobile-App-Developers / EasySplit
- Thêm contributors: mở Pull Request để bổ sung tên và đóng góp

## License

Kiểm tra file `LICENSE` tại thư mục gốc. Nếu chưa có, mặc định chưa chỉ rõ; khuyến nghị dùng `MIT` hoặc license phù hợp cho dự án.

---

Nếu bạn muốn mình chuyển sang tiếng Anh hoàn toàn, hoặc bổ sung ví dụ môi trường `.env.example`, hãy cho biết — mình sẽ cập nhật tiếp.
