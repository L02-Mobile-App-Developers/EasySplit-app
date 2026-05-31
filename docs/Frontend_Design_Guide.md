# EasySplit — Frontend Design Guide

> **Stack:** React Native 0.81 · Expo 54 · Expo Router · TypeScript · Zustand · Axios  
> **Platform:** iOS · Android · Web

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Screen Inventory](#3-screen-inventory)
4. [Design System](#4-design-system)
5. [Component Library](#5-component-library)
6. [State Management](#6-state-management)
7. [API Layer](#7-api-layer)
8. [Authentication Flow](#8-authentication-flow)
9. [Screen-by-Screen Design Specs](#9-screen-by-screen-design-specs)
10. [Data Types Reference](#10-data-types-reference)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Error Handling Patterns](#12-error-handling-patterns)
13. [Free Tier & Usage Limits](#13-free-tier--usage-limits)

---

## 1. Project Structure

```
frontend/
├── app/                        # Expo Router file-based routing
│   ├── _layout.tsx             # Root layout (auth guard, theme provider)
│   ├── index.tsx               # Redirect splash → auth or tabs
│   ├── onboarding.tsx          # First-launch onboarding
│   ├── auth/
│   │   ├── login.tsx           # Login screen
│   │   ├── register.tsx        # Register screen
│   │   └── forgot-password.tsx # Password reset screen
│   └── (tabs)/                 # Main bottom tab navigator
│       ├── _layout.tsx         # Tab bar configuration
│       ├── index.tsx           # Home / Dashboard
│       ├── group/
│       │   ├── index.tsx       # Group list
│       │   ├── add.tsx         # Create group
│       │   └── [id]/
│       │       ├── index.tsx        # Group detail (expenses, balances, members)
│       │       ├── add-expense.tsx  # Add expense form
│       │       ├── add-member.tsx   # Add member screen
│       │       ├── expense/
│       │       │   └── [expenseId].tsx   # Expense detail
│       │       ├── pay/
│       │       │   ├── index.tsx         # Settlements list + smart settle
│       │       │   └── [payId].tsx       # Settlement detail
│       │       └── reminder/
│       │           └── [reminderId].tsx  # Reminder detail
│       ├── friend/
│       │   ├── index.tsx       # Friends list + requests
│       │   └── add.tsx         # Find & add friends
│       ├── history/
│       │   └── index.tsx       # Global activity/history feed
│       └── profile/
│           └── index.tsx       # User profile + subscription
├── api/
│   ├── client.ts               # Axios instance + interceptors
│   ├── endpoints.ts            # All API endpoint constants
│   ├── groupApi.ts             # Group-level helper
│   ├── services/               # Domain service modules
│   │   ├── auth.service.ts
│   │   ├── me.service.ts
│   │   ├── group.service.ts
│   │   ├── expense.service.ts
│   │   ├── balance.service.ts
│   │   ├── settlement.service.ts
│   │   ├── reminder.service.ts
│   │   ├── activity.service.ts
│   │   └── friend.service.ts
│   ├── storage/                # Token persistence (AsyncStorage)
│   └── types/                  # TypeScript interfaces for API models
├── components/
│   ├── ThemedText.tsx          # Typography component with theme support
│   ├── TopAppBar.tsx           # Reusable top navigation bar
│   ├── header.tsx              # Screen header
│   └── navigationBar.tsx      # Custom bottom navigation bar
├── constants/                  # Theme tokens, colors, sizes
├── hooks/                      # Custom React hooks (useAuth, useTheme, etc.)
├── store/                      # Zustand stores
├── services/                   # Non-API services (notifications, etc.)
├── types/                      # Shared TypeScript types
└── assets/images/              # App icons, splash, logo
```

---

## 2. Navigation Architecture

EasySplit uses **Expo Router** (file-based routing, similar to Next.js).

### Route Tree

```
/                          → index.tsx (redirect guard)
/onboarding                → Onboarding screen
/auth/login                → Login
/auth/register             → Register
/auth/forgot-password      → Forgot Password
/(tabs)/                   → Main App (authenticated)
  ├── index                → Home / Dashboard
  ├── group/               → Group List
  │   ├── add              → Create Group
  │   └── [id]/            → Group Detail
  │       ├── (index)      → Group overview
  │       ├── add-expense  → Add Expense
  │       ├── add-member   → Add Member
  │       ├── expense/[expenseId] → Expense Detail
  │       ├── pay/         → Settlements
  │       │   └── [payId]  → Settlement Detail
  │       └── reminder/[reminderId] → Reminder Detail
  ├── friend/              → Friends
  │   └── add              → Find Friends
  ├── history/             → Activity History
  └── profile/             → User Profile
```

### Auth Guard

The root `_layout.tsx` checks the Zustand auth store:
- **Unauthenticated** → redirect to `/auth/login`
- **Authenticated, first launch** → redirect to `/onboarding`
- **Authenticated** → render `(tabs)` navigator

---

## 3. Screen Inventory

| Screen | Route | Description |
|--------|-------|-------------|
| Splash / Redirect | `/` | Auto-redirect based on auth state |
| Onboarding | `/onboarding` | First-launch intro slides |
| Login | `/auth/login` | Email + password sign in |
| Register | `/auth/register` | New account creation |
| Forgot Password | `/auth/forgot-password` | Firebase password reset |
| Home / Dashboard | `/(tabs)/` | Summary: balance overview, recent activity |
| Group List | `/(tabs)/group` | All groups the user belongs to |
| Create Group | `/(tabs)/group/add` | New group form |
| Group Detail | `/(tabs)/group/[id]` | Expenses, balances, members, smart settle |
| Add Expense | `/(tabs)/group/[id]/add-expense` | Expense form with split mode selector |
| Add Member | `/(tabs)/group/[id]/add-member` | Search and add group members |
| Expense Detail | `/(tabs)/group/[id]/expense/[expenseId]` | Expense info + participants |
| Settlements | `/(tabs)/group/[id]/pay` | Settlement list + smart settle |
| Settlement Detail | `/(tabs)/group/[id]/pay/[payId]` | Single settlement record |
| Reminder Detail | `/(tabs)/group/[id]/reminder/[reminderId]` | Reminder status |
| Friends | `/(tabs)/friend` | Friends list + pending requests |
| Add Friend | `/(tabs)/friend/add` | User search + friend requests |
| History | `/(tabs)/history` | Global activity log with filters |
| Profile | `/(tabs)/profile` | User info + subscription + logout |

---

## 4. Design System

### 4.1 Color Palette

EasySplit uses a dark-primary palette with vibrant accent colors.

| Token | Usage | Recommended Value |
|-------|-------|-------------------|
| `primary` | Brand CTA buttons, active state | `#6C63FF` (indigo-violet) |
| `primaryLight` | Light tint, backgrounds | `#EDE9FF` |
| `secondary` | Friend/social actions | `#FF6584` (coral-pink) |
| `success` | Positive balances, paid | `#00C48C` (mint green) |
| `danger` | Negative balances, errors | `#FF5252` (red) |
| `warning` | Pending state, reminders | `#FFA726` (amber) |
| `bgDark` | Screen background (dark) | `#0F0F1A` |
| `bgCard` | Card background (dark) | `#1C1C2E` |
| `bgSurface` | Elevated surface | `#252538` |
| `textPrimary` | Main text | `#FFFFFF` |
| `textSecondary` | Subtitles, captions | `#A0A0C0` |
| `textMuted` | Disabled, placeholders | `#5A5A7A` |
| `border` | Card borders, dividers | `#2E2E4A` |

### 4.2 Typography

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `h1` | Inter | 28sp | 700 | Screen titles |
| `h2` | Inter | 22sp | 700 | Section headers |
| `h3` | Inter | 18sp | 600 | Card titles |
| `body` | Inter | 16sp | 400 | Primary body |
| `bodySm` | Inter | 14sp | 400 | Secondary body |
| `caption` | Inter | 12sp | 400 | Labels, timestamps |
| `amount` | Inter | 20sp | 700 | Monetary values |
| `amountLg` | Inter | 32sp | 800 | Balance hero display |

> Load via `@expo-google-fonts/inter` or system fallback.

### 4.3 Spacing Scale

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `xxl` | 48px |

### 4.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Tags, chips |
| `md` | 12px | Cards |
| `lg` | 16px | Modals, sheets |
| `xl` | 24px | Full cards |
| `full` | 9999px | Buttons, avatars |

### 4.5 Shadows / Elevation

```
cardShadow: {
  shadowColor: "#6C63FF",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,   // Android
}
```

---

## 5. Component Library

### 5.1 ThemedText

Path: [`components/ThemedText.tsx`](file:///d:/HCMUT/Mobile App/easy_split/EasySplit-app/frontend/components/ThemedText.tsx)

Wraps `<Text>` with auto dark/light theme color via `useColorScheme`.

```tsx
<ThemedText type="title">EasySplit</ThemedText>
<ThemedText type="subtitle">Manage expenses together</ThemedText>
<ThemedText type="defaultSemiBold">Balance</ThemedText>
```

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `type` | `"default" \| "title" \| "defaultSemiBold" \| "subtitle" \| "link"` | `"default"` |
| `style` | `StyleProp<TextStyle>` | — |
| `children` | `ReactNode` | — |

---

### 5.2 TopAppBar

Path: [`components/TopAppBar.tsx`](file:///d:/HCMUT/Mobile App/easy_split/EasySplit-app/frontend/components/TopAppBar.tsx)

Reusable app bar with title, back button, and optional right actions.

```tsx
<TopAppBar
  title="Group Detail"
  onBack={() => router.back()}
  rightIcon="settings"
  onRightPress={() => openSettings()}
/>
```

---

### 5.3 NavigationBar

Path: [`components/navigationBar.tsx`](file:///d:/HCMUT/Mobile App/easy_split/EasySplit-app/frontend/components/navigationBar.tsx)

Custom bottom tab bar with icons, active indicator, and badges.

---

### 5.4 Recommended Additional Components

These components should be implemented to cover all use cases:

#### AmountDisplay
```tsx
<AmountDisplay
  amount={350000}
  currency="VND"
  sign="positive"  // "positive" | "negative" | "neutral"
  size="lg"
/>
// Renders: +350,000 ₫
```

#### GroupCard
```tsx
<GroupCard
  group={group}
  myBalance={balance}
  onPress={() => router.push(`/group/${group.id}`)}
/>
```

Fields: group name, category icon/emoji, member count, your net balance (color-coded), last activity snippet.

#### ExpenseCard
```tsx
<ExpenseCard
  expense={expense}
  myShare={myShare}
  onPress={() => router.push(`/group/${id}/expense/${expense.id}`)}
/>
```

Fields: description, amount, who paid, split mode badge, your share, date.

#### MemberAvatar
```tsx
<MemberAvatar
  user={member}
  role="owner"
  size={40}
  showRole
/>
```

#### SplitModeSelector
```tsx
<SplitModeSelector
  value={splitMode}
  onChange={setSplitMode}
  // modes: "equal" | "amount" | "percent" | "weight"
/>
```

#### DebtCard
```tsx
<DebtCard
  from={fromUser}
  to={toUser}
  amount={amount}
  onPay={() => openSettlementModal()}
/>
```

#### BalanceChip
```tsx
<BalanceChip balance={350000} />  // Green "+350k"
<BalanceChip balance={-120000} /> // Red  "-120k"
```

#### ReminderBadge
```tsx
<ReminderBadge status="pending" />  // Amber
<ReminderBadge status="sent" />     // Green
<ReminderBadge status="canceled" /> // Gray
```

---

## 6. State Management

EasySplit uses **Zustand** for global client state.

### 6.1 Auth Store

```typescript
// store/auth.store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUser: () => Promise<void>;
  setUser: (user: User) => void;
}
```

### 6.2 Recommended Additional Stores

```typescript
// store/group.store.ts
interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  fetchGroups: () => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
}

// store/expense.store.ts
interface ExpenseState {
  expenses: Expense[];
  currentExpense: Expense | null;
  pagination: PaginationMeta | null;
  fetchExpenses: (groupId: string, page?: number) => Promise<void>;
}

// store/balance.store.ts
interface BalanceState {
  balances: Balance[];
  myBalance: Balance | null;
  debts: Transfer[];
  fetchBalances: (groupId: string) => Promise<void>;
  fetchMyBalance: (groupId: string) => Promise<void>;
  fetchDebts: (groupId: string) => Promise<void>;
}
```

### 6.3 Token Persistence

Tokens are persisted via `AsyncStorage` (see `api/storage/`). The Axios client reads from storage on app start and attaches `Authorization: Bearer <token>` to all protected requests.

---

## 7. API Layer

### 7.1 API Client

Path: [`api/client.ts`](file:///d:/HCMUT/Mobile App/easy_split/EasySplit-app/frontend/api/client.ts)

- Base URL from `EXPO_PUBLIC_API_URL` env variable
- Request interceptor: attach `Authorization: Bearer <token>`
- Response interceptor: handle 401 → auto-logout; unwrap error envelopes

```typescript
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});
```

### 7.2 Service Modules

| Service File | Domain | Key Methods |
|-------------|---------|-------------|
| `auth.service.ts` | Auth | `syncUser()`, `login()`, `register()`, `logout()` |
| `me.service.ts` | Profile | `getMe()`, `updateMe()`, `getSubscription()`, `getUsage()` |
| `group.service.ts` | Groups | `getGroups()`, `getGroup()`, `createGroup()`, `updateGroup()`, `closeGroup()`, `getMembers()`, `addMember()`, `removeMember()`, `updateMemberRole()` |
| `expense.service.ts` | Expenses | `getExpenses()`, `getExpense()`, `createExpense()`, `updateExpense()`, `deleteExpense()` |
| `balance.service.ts` | Balances | `getBalances()`, `getMyBalance()` |
| `settlement.service.ts` | Settlements | `getDebts()`, `getSettlements()`, `createSettlement()`, `generateSmartSettle()`, `groupSettlement()` |
| `reminder.service.ts` | Reminders | `getReminders()`, `createReminder()`, `cancelReminder()` |
| `activity.service.ts` | Activity | `getActivities()`, `getHistory()` |
| `friend.service.ts` | Friends | `getFriends()`, `getRequests()`, `sendRequest()`, `acceptRequest()`, `rejectRequest()`, `unfriend()` |

### 7.3 Idempotency

For financial mutations (`createExpense`, `createSettlement`, `groupSettlement commit`), always send an `Idempotency-Key` header:

```typescript
const key = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
headers: { 'Idempotency-Key': key }
```

Safe to retry with the same key — backend returns original result.

---

## 8. Authentication Flow

```
App Start
    │
    ▼
Check token in AsyncStorage
    │
    ├── No token ──────────────► /auth/login
    │
    └── Token found
            │
            ▼
        POST /auth/sync (verify & refresh user)
            │
            ├── Success ───────► /(tabs)/ (Home)
            │
            └── 401 Error ─────► Clear token → /auth/login
```

### Login Flow

```
Login Screen
    │
    ├── Firebase signInWithEmailAndPassword(email, password)
    │       │
    │       ├── Success: get Firebase ID token
    │       │       │
    │       │       └── POST /auth/sync
    │       │               │
    │       │               └── Store user + token → Navigate to /(tabs)/
    │       │
    │       └── Error: show "Invalid credentials"
    │
    └── "Forgot Password" → /auth/forgot-password
                                │
                                └── sendPasswordResetEmail(email)
```

### Register Flow

```
Register Screen
    │
    ├── Firebase createUserWithEmailAndPassword(email, password)
    │       │
    │       └── Success: updateProfile({ displayName })
    │               │
    │               └── POST /auth/sync → Store user → /(tabs)/
    │
    └── Error handling: email-already-in-use, weak-password, etc.
```

---

## 9. Screen-by-Screen Design Specs

### 9.1 Home / Dashboard `/(tabs)/`

**Purpose:** Overview of user's financial status across all groups.

**Sections:**
1. **Header** — greeting ("Hi, {displayName}!"), avatar
2. **Net Balance Card** — total balance across all groups (color-coded hero number)
3. **My Groups** — horizontal scroll cards, each showing group name + my balance
4. **Recent Activity** — last 5 audit log entries across all groups
5. **Quick Actions** — "Add Expense", "Settle Up" CTA buttons

**API Calls:** `GET /groups`, `GET /me`, balance per group (batched or lazy)

---

### 9.2 Group List `/(tabs)/group`

**Layout:** Vertical list of `GroupCard` components.

**GroupCard fields:**
- Group name + category emoji (🏖️ trip, 🍜 food, 🏠 roommate, 💼 project)
- Member count
- Your balance in that group (green/red)
- Last activity snippet + time

**Header actions:** Search bar, "+" button → `/group/add`

**API:** `GET /groups`

---

### 9.3 Create Group `/(tabs)/group/add`

**Form fields:**

| Field | Type | Validation |
|-------|------|------------|
| Group Name | Text input | Required, max 80 chars |
| Category | Selector pills | Required: trip / food / roommate / project / other |

**CTA:** "Create Group" → `POST /groups` → navigate to group detail

---

### 9.4 Group Detail `/(tabs)/group/[id]`

**Tab structure within the screen:**

| Tab | Content |
|-----|---------|
| **Expenses** | Paginated expense list; FAB "+" to add expense |
| **Balances** | Per-member balance list; "Settle" button per debt |
| **Members** | Member list with roles; "Add Member" button |
| **Activity** | Recent audit log for this group |

**Header:**
- Group name + category icon
- Status badge (`active` / `closed`)
- Settings icon (admin/owner only) → edit group, close group

**Balances tab extra:**
- Smart Settle button → shows suggestions modal
- One-click Group Settle (simulate → confirm flow)

**API:** `GET /groups/:id`, `GET /groups/:id/expenses`, `GET /groups/:id/balances`, `GET /groups/:id/members`, `GET /groups/:id/activities`

---

### 9.5 Add Expense `/(tabs)/group/[id]/add-expense`

**Form layout:**

```
┌─────────────────────────────────┐
│  Description  [________________]│
│  Amount       [________________]│
│  Currency     [VND ▼]           │
│                                 │
│  Paid by      [Avatar selector] │
│                                 │
│  Split mode:                    │
│  [Equal] [Amount] [%] [Weight]  │
│                                 │
│  Participants:                  │
│  ┌─────────────────────────────┐│
│  │ [Avatar] Name     [value]   ││
│  │ [Avatar] Name     [value]   ││
│  └─────────────────────────────┘│
│                                 │
│  [     Add Expense      ]       │
└─────────────────────────────────┘
```

**Split mode UX:**

| Mode | Participant Input | Validation |
|------|------------------|------------|
| `equal` | Read-only (auto-calculated) | N/A |
| `amount` | VND amount per person | Sum must equal total |
| `percent` | Percentage per person | Sum must equal 100% |
| `weight` | Relative weight | Proportional (any values) |

**API:** `POST /groups/:id/expenses` with `Idempotency-Key`

---

### 9.6 Expense Detail `/(tabs)/group/[id]/expense/[expenseId]`

**Sections:**
1. Description + amount (large)
2. Paid by → avatar + name
3. Split breakdown table (participant, share amount)
4. Split mode badge
5. Created by + date
6. Edit / Delete actions (if permitted)

**API:** `GET /groups/:id/expenses/:expenseId`, `PATCH`, `DELETE`

---

### 9.7 Settlements `/(tabs)/group/[id]/pay`

**Layout:**

```
┌─ Debt Summary ───────────────────────┐
│  [Avatar] John  →  Jane  ₫300,000    │
│  [Avatar] Alice →  Jane  ₫150,000    │
└──────────────────────────────────────┘

[ ✨ Smart Settle Suggestions ]
[ ⚡ One-Click Settle All     ]

─── Settlement History ───────────────
  ┌────────────────────────────────┐
  │ John paid Jane   ₫300,000     │
  │ 2 days ago · Bank transfer     │
  └────────────────────────────────┘
```

**Smart Settle flow:**
1. Tap "Smart Settle" → `POST /smart-settle/suggestions`
2. Show suggestion modal: list of optimized `from → to → amount`
3. Tap any → pre-fill settlement form

**One-Click Settle flow:**
1. Tap "Settle All" → `POST /group-settlement { mode: "simulate" }` → preview dialog
2. Confirm → `POST /group-settlement { mode: "commit", note: "..." }` + Idempotency-Key

**API:** `GET /debts`, `GET /settlements`, `POST /settlements`, `POST /smart-settle/suggestions`, `POST /group-settlement`

---

### 9.8 Settlement Detail `/(tabs)/group/[id]/pay/[payId]`

**Fields:**
- From user → To user (avatars + names)
- Amount (large display)
- Note
- Created at
- Created by

**API:** `GET /groups/:id/settlements/:payId`

---

### 9.9 Add Member `/(tabs)/group/[id]/add-member`

**Flow:**
1. Search input → `GET /users?q=<query>`
2. Result list: avatar, name, email
3. Tap user → role selector (Admin / Member)
4. Confirm → `POST /groups/:id/members`

---

### 9.10 Friends `/(tabs)/friend`

**Tabs:**

| Tab | Content |
|-----|---------|
| **Friends** | List of accepted friends with avatar + name; unfriend option |
| **Requests** | Incoming: accept/reject buttons; Outgoing: pending badge |

**Header:** Search icon → `/friend/add`

**API:** `GET /friends`, `GET /friends/requests`, `POST /friends/:id/accept`, `DELETE /friends/:id`, `POST /friends/:id/unfriend`

---

### 9.11 Add Friend `/(tabs)/friend/add`

**Search bar** → `GET /users?q=<query>` → user result cards with "Add Friend" button → `POST /friends`

---

### 9.12 History `/(tabs)/history`

**Filter bar (top):**
- Date range picker (`from` / `to`)
- Type filter chips: All / Expense / Settlement / Reminder / Member / Group
- Actor filter (search member)

**Feed:** Chronological list of `AuditLog` entries with:
- Actor avatar + name
- Action description (e.g., "added expense 'Dinner' for ₫450,000")
- Entity type icon
- Timestamp (relative + absolute on press)

**API:** `GET /groups/:id/history?from=&to=&actorId=&type=`

---

### 9.13 Profile `/(tabs)/profile`

**Sections:**
1. **User Info** — avatar (editable), display name (editable), email
2. **Subscription Card** — plan badge (Free/Premium), period dates
3. **Usage Bar** — groups used / max; smart settle uses this month / max
4. **Settings** — theme toggle (light/dark), notifications
5. **Logout** button

**API:** `GET /me`, `PATCH /me`, `GET /me/subscription`, `GET /me/usage`

---

## 10. Data Types Reference

### User
```typescript
interface User {
  id: string;          // UUID
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;   // ISO 8601
}
```

### Group
```typescript
interface Group {
  id: string;
  name: string;
  category: "trip" | "food" | "roommate" | "project" | "other";
  ownerId: string;
  status: "active" | "closed";
  role: "owner" | "admin" | "member";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### Expense
```typescript
interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;           // Integer VND
  currency: string;         // "VND"
  paidByUserId: string;
  splitMode: "equal" | "amount" | "percent" | "weight";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants: ExpenseParticipant[];
  payer: User | null;
  creator: User | null;
}

interface ExpenseParticipant {
  expenseId: string;
  userId: string;
  value: number;
  user: User | null;
}
```

### Balance
```typescript
interface Balance {
  groupId: string;
  userId: string;
  balance: number;  // Positive = owed to you; Negative = you owe
}
```

### Settlement
```typescript
interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
}
```

### Reminder
```typescript
interface Reminder {
  id: string;
  groupId: string;
  targetUserId: string;
  status: "pending" | "sent" | "canceled";
  message: string;
  channel: "in_app" | "email" | "sms";
  scheduledAt?: string;
}
```

### AuditLog
```typescript
interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: "expense" | "settlement" | "reminder" | "member" | "group";
  entityId: string;
  createdAt: string;
}
```

### Subscription
```typescript
interface Subscription {
  plan: "free" | "premium";
  status: "trialing" | "active" | "grace_period" | "canceled" | "expired";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}
```

---

## 11. API Endpoints Reference

All endpoints are relative to `EXPO_PUBLIC_API_URL` (e.g., `http://localhost:8080/api/v1`).

### Auth & User

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/sync` | Sync Firebase user to Firestore | Bearer |
| `GET` | `/me` | Get current user profile | Bearer |
| `PATCH` | `/me` | Update display name / avatar | Bearer |
| `GET` | `/me/subscription` | Get subscription plan & status | Bearer |
| `GET` | `/me/usage` | Get free tier usage counters | Bearer |
| `GET` | `/users?q=` | Search users by name/email | Bearer |

### Groups

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups` | List user's groups |
| `POST` | `/groups` | Create new group |
| `GET` | `/groups/:groupId` | Get group details |
| `PATCH` | `/groups/:groupId` | Update group name/category |
| `POST` | `/groups/:groupId/close` | Close group (owner only) |

### Members

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups/:groupId/members` | List members |
| `POST` | `/groups/:groupId/members` | Add member |
| `PATCH` | `/groups/:groupId/members/:userId` | Update member role |
| `DELETE` | `/groups/:groupId/members/:userId` | Remove member |

### Expenses

| Method | Path | Description | Special Header |
|--------|------|-------------|----------------|
| `GET` | `/groups/:groupId/expenses` | List expenses (paginated) | — |
| `POST` | `/groups/:groupId/expenses` | Create expense | `Idempotency-Key` |
| `GET` | `/groups/:groupId/expenses/:expenseId` | Get expense | — |
| `PATCH` | `/groups/:groupId/expenses/:expenseId` | Update expense | — |
| `DELETE` | `/groups/:groupId/expenses/:expenseId` | Delete expense | — |

### Balances & Settlements

| Method | Path | Description | Special Header |
|--------|------|-------------|----------------|
| `GET` | `/groups/:groupId/balances` | All member balances | — |
| `GET` | `/groups/:groupId/balances/me` | My balance | — |
| `GET` | `/groups/:groupId/debts` | Simplified debt edges | — |
| `GET` | `/groups/:groupId/settlements` | List settlements | — |
| `POST` | `/groups/:groupId/settlements` | Create settlement | `Idempotency-Key` |
| `GET` | `/groups/:groupId/settlements/:settlementId` | Get settlement | — |
| `POST` | `/groups/:groupId/smart-settle/suggestions` | Smart settle suggestions | — |
| `POST` | `/groups/:groupId/group-settlement` | Simulate/commit group settle | `Idempotency-Key` (commit only) |

### Reminders

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups/:groupId/reminders` | List reminders |
| `POST` | `/groups/:groupId/reminders` | Create reminder(s) |
| `POST` | `/groups/:groupId/reminders/:reminderId/cancel` | Cancel reminder |

### Activity

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups/:groupId/activities` | Recent activity (paginated) |
| `GET` | `/groups/:groupId/history` | Filtered history |

### Friends

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/friends` | Friends list |
| `GET` | `/friends/requests` | Pending requests |
| `POST` | `/friends` | Send friend request |
| `POST` | `/friends/:requestId/accept` | Accept request |
| `DELETE` | `/friends/:requestId` | Reject request |
| `POST` | `/friends/:friendId/unfriend` | Unfriend |

### Health

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | Public |
| `GET` | `/ready` | Public |

---

## 12. Error Handling Patterns

### API Response Envelope

**Success:**
```json
{
  "data": { ... },
  "message": "OK"
}
```

**Paginated:**
```json
{
  "data": [...],
  "message": "OK",
  "meta": {
    "pagination": { "page": 1, "limit": 20, "total": 85, "totalPages": 5 }
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount is required",
    "details": [{ "field": "amount", "issue": "Required" }]
  }
}
```

### HTTP Status Codes → UI Handling

| Code | Meaning | UI Action |
|------|---------|-----------|
| `200/201` | Success | Update state, show success toast |
| `400` | Validation error | Show inline field errors |
| `401` | Unauthorized | Clear token → redirect to Login |
| `403` | Forbidden / limit | Show upgrade prompt or permission error |
| `404` | Not found | Show "Not found" state |
| `409` | Idempotency conflict | Log warning; different body was sent with same key |
| `5xx` | Server error | Show generic error + retry option |

### Idempotency Key Strategy

```typescript
// For any POST that creates financial records:
const key = crypto.randomUUID(); // or Date.now() + random string
// Store the key in component state before submission
// On network error, retry with SAME key → safe
// On 409, it means a different body was already submitted → show error
```

---

## 13. Free Tier & Usage Limits

Use `GET /me/usage` to show the user their quota status.

```typescript
interface Usage {
  groupCount: number;
  smartSettleUsedThisMonth: number;
  freeMaxGroups: number;
  freeSmartSettlePerMonth: number;
}
```

### UI Guidance

| Feature | Free Limit | UI When Exceeded |
|---------|-----------|-----------------|
| Groups | `freeMaxGroups` (e.g., 5) | Disable "Create Group" → show upgrade banner |
| Smart Settle | `freeSmartSettlePerMonth` per month | Disable button → "Upgrade to Premium" modal |

### Usage Progress Bar Component

```tsx
<UsageBar
  label="Groups"
  used={usage.groupCount}
  max={usage.freeMaxGroups}
/>
<UsageBar
  label="Smart Settle this month"
  used={usage.smartSettleUsedThisMonth}
  max={usage.freeSmartSettlePerMonth}
/>
```

---

## Appendix: Environment Variables

```bash
# frontend/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api/v1
```

> On physical device, use LAN IP instead of `localhost`.

---

*Generated for EasySplit — L02-Mobile-App-Developers — 2026*
