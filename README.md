# My Money — Personal Finance Tracker & Smart Money Manager ৳

A modern, responsive, mobile-first personal finance management web application built for seamless tracking, budgeting, and financial analysis with all calculations localized in **Bangladeshi Taka (BDT ৳)**.

---

## 🌟 Key Features

1. **Dashboard Overview**
   - 6 Live Financial Summary Cards (Income, Expenses, Net Cash Flow, Available Balance across all accounts, Total Savings, Remaining Monthly Budget).
   - Dynamic Month-over-Month comparison indicators with accurate financial direction indicators (expense increase flagged in red).
   - Six-month Income vs. Expense bar chart.
   - Category expense breakdown doughnut chart with live center totals.
   - Daily spending trend area chart.
   - Budget utilization progress monitors.
   - Recent transactions quick ledger with inline edit and delete.

2. **Transaction Ledger & Smart Filtering**
   - Record **Income**, **Expenses**, **Transfers** between accounts, and **Refunds**.
   - Dual-account transfers that adjust balances accurately without falsely inflating income/expenses.
   - Powerful multi-parameter filtering: search by keyword, transaction type, category, account, payment method, date range, and amount range.
   - Sort by Newest, Oldest, Highest, and Lowest amounts.
   - Paginated table view on desktop and card layout on mobile.

3. **Smart Budget Management**
   - Overall monthly budgets and category-specific spending caps.
   - Live progress bars with visual alert thresholds (50%, 75%, 90%, 100%).
   - Prominent alerts explaining exactly which categories have exceeded their limits and by how much in ৳.

4. **Accounts & Mobile Banking**
   - First-class support for **Cash**, **bKash**, **Nagad**, **Rocket**, **Bank Accounts**, **Debit & Credit Cards**.
   - Opening balances with automatic balance reconciliation based on subsequent inflows and outflows.
   - Account-to-account funds transfer.

5. **Financial Insights & Spending Forecast**
   - Automated rule-based observations (no paid AI required): top expense drivers, daily & weekly burn rates, savings velocity, and risk warnings.
   - End-of-month spending projections calculated from current burn rate.

6. **Comprehensive Reports & PDF Export**
   - Monthly and annual reporting views.
   - Category-wise expense tables with percentage breakdown.
   - Client-side downloadable **PDF reports** via `jsPDF` and `jspdf-autotable`.
   - Browser print-ready layout.

7. **Savings Goals & Future Funds**
   - Set targets for emergencies, gadgets, travel, or education.
   - Record transparent contributions and withdrawals.
   - Visual completion percentage.

8. **Recurring Bills & Income Schedules**
   - Repeating schedules: Daily, Weekly, Monthly, Yearly (e.g. WiFi bills, Rent, Salary, Tuition).
   - One-click "Mark Paid" button that logs a real transaction and advances the next due date.

9. **Calendar View**
   - Monthly calendar grid displaying daily income and expense totals.
   - Click any date to view all transactions recorded on that day or add a new entry.

10. **Data Portability & Import/Export**
    - One-click CSV export of all or filtered transactions.
    - Full JSON snapshot backup and restoration.
    - Bulk CSV statement importer with schema validation and live preview modal before committing.
    - Downloadable CSV template.

11. **Bangladeshi Taka (৳) Localization**
    - Native `৳` currency symbol throughout.
    - Bangladeshi/Indian comma grouping format (`৳1,23,456.00`).
    - Standard `dd/MM/yyyy` date representation.

12. **Light & Dark Theme**
    - Instant theme switching with persistent storage.
    - System preference detection.

---

## 🛠️ Technology Stack

- **Frontend:** React 18 + TypeScript
- **Build System:** Vite
- **Styling:** Tailwind CSS (with Dark Mode support)
- **Icons:** Lucide React
- **Visualizations:** Recharts
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security)
- **Export Utilities:** PapaParse (CSV), jsPDF & jsPDF-autotable (PDF)
- **Validation & Dates:** Zod, date-fns

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A free [Supabase](https://supabase.com) account

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd takkkkkkaa
npm install
```

### 3. Setup Supabase Database
1. Go to [Supabase](https://supabase.com) and create a new free project.
2. Navigate to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` from this project.
4. Copy the entire SQL script and paste it into the Supabase SQL Editor.
5. Click **Run**. This will create:
   - `profiles`, `accounts`, `categories`, `transactions`, `budgets`, `savings_goals`, `savings_contributions`, `recurring_transactions` tables.
   - Row Level Security (RLS) policies ensuring users only see their own records.
   - Automatic user profile and default category initialization triggers.
   - Updated-at triggers.

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Find these in your Supabase Dashboard under Project Settings -> API)*

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Free Deployment (Vercel)

1. Push your repository to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon/Public Key
5. Click **Deploy**. Vercel will build and assign you a permanent live HTTPS URL!

---

## 🔒 Security Best Practices
- **Row Level Security (RLS):** Every single database table is protected by PostgreSQL RLS. A user can strictly query and mutate only records tied to their authenticated `auth.uid()`.
- **No Secret Leakage:** The Supabase Service Role Key is never bundled into client-side code; only the anonymous public client key is used.
