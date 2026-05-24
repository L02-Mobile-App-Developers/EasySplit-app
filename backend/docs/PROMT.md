# EasySplit Backend — Engineering Prompt

> **Role:** Senior Backend Engineer — Node.js (TypeScript), PostgreSQL, RESTful API Design
>
> **Mission:** Build the complete backend system for the **EasySplit** application, strictly following the specifications in `Backend-API-Spec.md` and the operating rules defined in `AGENTS.md`.

---

## Tech Stack

| Category           | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Runtime**        | Node.js                                                     |
| **Language**       | TypeScript                                                  |
| **Framework**      | Express.js (or NestJS if more suitable for enterprise use)  |
| **Database**       | PostgreSQL                                                  |
| **ORM / Query**    | Prisma or TypeORM (type-safe, easy migration management)    |
| **Auth**           | JWT                                                         |
| **Validation**     | Joi or Zod                                                  |

---

## Core Directives

These principles **must never** be violated:

### 1. Data Integrity (ACID)
Money is involved. Every operation that alters balances (Expense creation, Settlement) **MUST** run inside a **database transaction**.

### 2. Zero-Sum Game
The sum of all balances in a group **must always equal zero**. Write unit tests to assert this invariant in every financial calculation.

### 3. Idempotency
Implement an `Idempotency-Key` header for all financial POST endpoints (e.g., creating an Expense, Settlement). Use Redis or a dedicated PostgreSQL table to reject duplicate requests within a **24-hour window**.

### 4. Authorization & Entitlement
Always verify:
- **Role**: Member / Admin / Owner
- **Plan**: Free / Premium

Never skip these checks on any endpoint.

### 5. Currency Convention
Store monetary amounts as **integers** (`Integer` / `BigInt` — VND). **Never** use floats or doubles to avoid decimal precision errors.

---

## Action Plan (Phased Execution)

Strictly follow `AGENTS.md`. Do **not** merge phases. Propose work phase-by-phase and wait for approval before coding.

| Phase | Description |
| ----- | ----------- |
| **Phase 1** | Project scaffolding — Node.js + TypeScript, directory structure, PostgreSQL connection, middleware (Error Handler, Auth, Logger). |
| **Phase 2** | Database schema design — Prisma schema / TypeORM entities for all models: `User`, `Subscription`, `Group`, `GroupMember`, `Expense`, `Balance`, `DebtEdge`, `Settlement`. Generate migrations. |
| **Phase 3** | Auth & User Profile module — Register, Login, JWT issuance, Me endpoint. |
| **Phase 4** | Group & Group Member module — CRUD, role-based access (Owner / Admin / Member). |
| **Phase 5** | Expense & Balance module — Split logic, balance recalculation, wrapped in transactions. |
| **Phase 6** | Settlement & Smart Settle module — Debt simplification, Free/Premium quota enforcement. |
| **Phase 7** | History & Pagination module — Complete remaining APIs, pagination, filtering. |

---

## First Task

1. Confirm that you have thoroughly read and understood both `Backend-API-Spec.md` and `AGENTS.md`.
2. Present a **detailed plan for Phase 1**, including:
   - Proposed directory structure
   - Packages to install
   - Configuration approach
3. Wait for explicit **"Approved"** before writing any code.

> **⛔ Do not write any code until approval is given.**
