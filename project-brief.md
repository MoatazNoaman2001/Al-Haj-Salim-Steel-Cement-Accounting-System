# Al-Haj Salim Steel & Cement Accounting System — Complete Project Brief

> **Purpose:** This document contains ALL context needed to build this system. Upload it at the start of a new chat to continue development.

---

## 1. Business Overview

**Client:** Al-Haj Salim (الحج سليم) — Steel & Cement Distribution Company, Assiut, Egypt
**Business Model:** Buys from factories, sells to 60+ traders/customers in Upper Egypt
**Scale:** 27.9M+ EGP across 16 bank accounts, massive daily transaction volume
**Current System:** Multiple Excel workbooks + handwritten paper sheets (error-prone, no audit trail)

### Key Personnel & Roles
| Person | Arabic | Role | System Access |
|--------|--------|------|---------------|
| الحج سليم | Owner | المالك | **Admin** — sees EVERYTHING including profits |
| يوسف يوسف | Partner/Manager | شريك/مدير | **Admin** |
| عبود | Cashier | كاشير أسيوط الجديدة | **Cashier** — own daily only, NO profits |
| توتا | Cashier | كاشير | **Cashier** — own daily only, NO profits |
| هشام | Bank Accountant | محاسب البنوك | TBD (bank module post-trial) |

---

## 2. Client-Requested Edits & Requirements

### Edit 1: Hide Profits (الأرباح) — CRITICAL
**Client explicitly requested:** All profit/loss columns (ارباح وخسائر) must be completely invisible to non-admin users. Only the owner (admin) can see profit data, profit reports, and profit-related calculations.

**Technical implementation:**
- Frontend: Conditionally render profit columns based on user role
- Backend: RLS policies exclude profit fields from cashier queries
- The ارباح وخسائر column in يومية الاسمنت is admin-only
- The الادارة وراس المال والارباح sheet equivalent is admin-only

### Edit 2: No Deletion, Only Corrections (نظام التصحيح) — CRITICAL
**Client explicitly stated:** There must be NO editing or deleting of entries. Only corrections are allowed, where the original entry stays visible and a new correction entry appears below it.

**Example the client understands:**
- Cashier enters 100,000 by mistake
- Cashier creates a "correction" → new row shows 50,000
- Original 100,000 stays with strikethrough
- Admin reviewing sees both entries and knows a correction happened

---

## 3. Technology Stack (Decided)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Next.js 14** (App Router) | SSR, RSC, great RTL support |
| UI | **shadcn/ui** + **Tailwind CSS** (RTL) | Arabic-first, customizable |
| Tables | **TanStack Table** | Complex data tables with sorting/filtering/pagination |
| Backend/DB | **Supabase** (PostgreSQL) | Auth, Realtime, RLS, Edge Functions |
| Auth | **Supabase Auth** | Role-based (admin vs cashier) |
| Realtime | **Supabase Realtime** | Live updates across 8 devices |
| Deployment | **PWA** (Progressive Web App) | Offline support, push notifications, no app store |
| Hosting | **Vercel** (frontend) + **Supabase Free** (backend, upgrade to Pro at delivery) |

**Devices:** 6 desktop + 2 mobile = 8 total users

---

## 4. Exact Data Structures (From Actual Files)

### 4A. يومية الاسمنت — Cement Daily Sales Sheet
**Source:** WhatsApp image (14/2/2026 daily sheet screenshot)

This is the PRIMARY screen the cashier uses every day. It has THREE sections:

#### Section 1: مبيعات يوم (Daily Sales Table)
Columns (right-to-left as shown in the actual sheet):

| Column | Arabic | Type | Notes |
|--------|--------|------|-------|
| التاريخ | Date | date | Auto-filled, e.g., 14/2/2026 |
| العدد | Quantity | number | Tons sold (negative = sale amount in EGP) |
| السعر | Unit Price | number | Price per ton, e.g., 3850, 3520 |
| النوع | Product Type | enum | مقاوم, عادة 32, عادة 42, تشطيبات, سايب جديد |
| التفاصيل | Customer/Details | text | Customer name, e.g., احمد توفيق |
| سعر البيع | Total Sale Price | computed | quantity * price, e.g., 96250 |
| السائق | Driver | FK | Driver name, e.g., يوسف فتحى |
| النولون | Transport per ton | number | Freight per ton, e.g., 115 |
| النولون (total) | Total Transport | computed | transport * quantity, e.g., 2875 |
| ارباح وخسائر | Profit/Loss | computed | **ADMIN ONLY** — e.g., 375, 800, -125 |

**Starting balance:** 557,672.5 (carried from previous day)
**Running balance updates with each transaction**

#### Section 2: الايداعات (Deposits)
Below the sales table:

| Column | Arabic | Type |
|--------|--------|------|
| التاريخ | Date | date |
| المبلغ | Amount | number |
| التفاصيل | Description | text |

Example: 14/2/2026 — 460,000 — توريد بيد عبود

#### Section 3: جدول البونات (Voucher/Inventory Table)
Bottom of daily sheet — tracks cement stock:

| Column | Arabic | Type | Example |
|--------|--------|------|---------|
| النوع | Product Type | enum | مقاوم, عادة 32, عادة 42, تشطيبات, سايب جديد |
| الرصيد المتبقي | Remaining Balance | computed | 175, 25 |
| المضاف | Added (received) | number | 100, 25 |
| المباع | Sold | number | -50, -25 |
| الباقي | Net Remaining | computed | 125, 25 |
| سعر القطع | Price per piece | number | 3750, 3400, 3700, 3100, 3425 |
| تكلفة الرصيد المتبقي | Remaining Cost | computed | 656250, 85000 |

**Key equations:**
- رصيد نقدي (Cash Balance) = Starting Balance + Sales - Deposits
- المعادلة صحيحة — system verifies daily balance
- الاجمالي = 745,172.5

### 4B. يومية الكاشير — Cashier Daily Ledger
**Source:** PDF file (عبود's report from دفتر الحسابات app)

| Column | Arabic | Type |
|--------|--------|------|
| التاريخ | Date | date |
| التفاصيل | Description | text |
| عليه | Debit (out) | number |
| له | Credit (in) | number |
| الرصيد | Running Balance | computed |

**Actual entries from PDF (14/2/2026):**
1. واصل من الحج سليم البيت — له: 795,030
2. واصل الحج سليم مصاريف — عليه: 10,000
3. تحصيل احمد هيبك — له: 100,000
4. تحصيل طارق أسيوط الجديد — له: 300,000
5. إيداع اسمنت التعمير — عليه: 460,000
6. إيداع اسمنت المصريين — عليه: 325,000
7. تحصيل حسين كمال أسيوط الجديد — له: 30,000
8. إيداع اسمنت المصريين — عليه: 40,000
9. واصل ايمن كمال شكرى — عليه: 370,000
10. غداء + مصاريف البريد — عليه: 230
11. واصل الحج سليم البيت — عليه: 19,800

**CRITICAL:** Daily MUST balance to ZERO. Total عليه = Total له = 1,225,030

### 4C. Excel Workbook (17-2-2026.xlsx) — 12 Sheets

| # | Sheet | Description | Rows×Cols |
|---|-------|-------------|-----------|
| 1 | الادارة وراس المال والارباح | **ADMIN ONLY** — master balances, profits, expenses | 469×24 |
| 2 | الاستثمار العقارى | Real estate, gold, currencies | 92×27 |
| 3 | حسابات البنوك | 16+ bank accounts with ledgers | 410×37 |
| 4 | حسابات فردانى | Individual customer accounts, loans | 595×93 |
| 5 | الجرد الاساسي | Inventory, loans (سلف), reserved orders | 432×65 |
| 6 | التجار | Customer ledgers (60+ customers) | 721×72 |
| 7 | الموردين | Supplier accounts | 405×42 |
| 8 | السائقين | Driver accounts, transport costs | 387×39 |
| 9 | العمال | Worker payments | 55×13 |
| 10 | عدة الشغل | Equipment/asset purchases | 35×6 |
| 11 | طلبات محجوزة | Reserved orders + currency trading | 81×23 |
| 12 | الارصده النهائيه | Summary of ALL balances | 102×2 |

### 4D. 16 Bank Accounts (حسابات_البنوك.xlsx)

| # | Bank | Balance (EGP) |
|---|------|---------------|
| 1 | بنك الاهلى (سليم) | 587,209 |
| 2 | بنك الاسكندرية هشام شركات | 9,158,731 |
| 3 | بنك الاسكندرية يوسف شركات | 6,137,247 |
| 4 | بنك مصر يوسف شركات | 309,585 |
| 5 | بنك مصر الشرق شركات | 3,092,494 |
| 6 | بنك الاسكندرية الشرق شركات | 6,093,648 |
| 7 | بنك ابو ظبى (الاول) | 513,215 |
| 8 | انستا باى بنك الاسكندريه | 1,020,606 |
| 9 | انستا باي بنك الاهلى | 657,289 |
| 10 | فودافون كاش | 76,425 |
| 11 | اتصالات كاش | 26,549 |
| 12 | البريد المصرى | 115,311 |
| 13 | فودافون كاش (جيمى) | 6,179 |
| 14 | فودافون كاش (يوسف يوسف) | 23,995 |
| 15 | الاهلى (يوسف يوسف) | 1,650 |
| 16 | بنك العقارى المصرى العربى | 50,000 |
| | **TOTAL** | **27,941,913** |

Each bank ledger: التاريخ, البيان, مدين, دائن, الرصيد

### 4E. Customer Account Structure (التجار)
Each customer has a ledger block:
التاريخ | التفاصيل | العدد | السعر | عليه | له | الرصيد

**Sample balances:** اسعد جورج حديد: -3,359,306 | شركة البدري: -5,472,300 | اشرف ديروط: 1,498,520
**Total customer balances:** -8,812,136 EGP

### 4F. Supplier Accounts (الموردين)
Same ledger structure. Key suppliers:
- الرضا ستيل (جيوشي brand) — main steel supplier
- مصر الدولية (اعالي البحار) — عز steel
- ستار ستيل, الغنيمي, سيد الوكال, حديد المصريين, حديد عز
**Total supplier balances:** 4,567,563 EGP

### 4G. Driver Accounts (السائقين)
Tracks: نولون (freight), عهدة (advances), مصاريف (expenses)
Key drivers: يوسف فتحى, خالد جمال, امجد و سامح ثروت, رجب محمد
**Total driver balances:** -4,319,545 EGP

### 4H. Product Types

**Cement (sold in tons/طن):**
مقاوم (3750-3850) | عادة 32 (3400-3520) | عادة 42 (3700) | تشطيبات (3100-3250) | مقاوم اسيوط (3700-3820) | مقاوم مصريين (3780-3800) | عادة مصريين (3750) | مهندس | سايب جديد 8/3 (3425)

**Steel (sold in kg/ك):**
عز (36-37/kg) | جيوشي (30.5-31.5/kg) | استثماري (31-34.5/kg) | بيانكو (35.75/kg) | كانات (35-39/kg) | كانات 2.5ل (36.55-37.5/kg)

### 4I. Admin Master Sheet (الادارة وراس المال والارباح) — ADMIN ONLY
Summary balances: اجمالى الارصدة: 76,680,574 | حسابات العملاء: 75,751,576 | مصاريف سليم: -621,590 | مصاريف يوسف: -1,181,417
Contains: daily profit tracking, expense tracking per person, currency trading, real estate investments

---

## 5. Audit Trail System

**RULE: NO DELETION — EVER. NO EDITING — EVER.**

Every transaction table has:
- id, is_corrected (bool), corrected_by_id (FK→self), correction_of_id (FK→self)
- correction_reason (text), created_by (FK→users), created_at (timestamp)

UI: Corrected = strikethrough+red | Correction = green+link to original

---

## 6. Permissions Model

**Admin:** See all, manage all, profits visible
**Cashier:** Own daily only, no profits, no other cashiers, no banks, no admin data

RLS: `USING (created_by = auth.uid() OR is_admin(auth.uid()))`

---

## 7. Contract & Timeline

**Price:** 45,000 EGP | **Trial:** End of Ramadan (~March 30, 2026)

**Trial scope:** Auth + يومية الاسمنت (3 sections) + يومية الكاشير + Corrections + Hide profits + Dashboard + PWA

**Post-trial:** يومية الحديد + الجرد + البنوك + العملاء + الموردين + السائقين + التقارير + Excel import

---

## 8. Key Business Rules

1. يومية الكاشير MUST balance to zero daily
2. Sales affect: inventory, customer balance, driver account, bank deposit
3. Negative customer balances are normal (credit sales)
4. Cement in tons (طن), steel in kilograms (ك)
5. Transport (النولون) tracked per delivery → driver account
6. Reserved orders = advance payments for future delivery
7. Currency/gold trading + real estate = admin only

---

## 9. Development Strategy

**Build order:** Schema → يومية الاسمنت screen → Auth → يومية الكاشير → Corrections → Dashboard → PWA
**Start with the exciting screen** (daily sheet), not boring auth
**Supabase Free** for dev → Pro at delivery ($25/month)
