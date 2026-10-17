-- ============================================================================
-- My Money – Personal Finance Tracker
-- Initial database schema migration
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper: Auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  default_currency TEXT NOT NULL DEFAULT 'BDT',
  timezone    TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  first_day_of_week INTEGER NOT NULL DEFAULT 0,
  theme       TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'cash'
                    CHECK (type IN ('cash', 'bank', 'bkash', 'nagad', 'rocket', 'card', 'other')),
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  icon            TEXT NOT NULL DEFAULT 'Wallet',
  color           TEXT NOT NULL DEFAULT '#14b8a6',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon        TEXT NOT NULL DEFAULT 'Tag',
  color       TEXT NOT NULL DEFAULT '#6B7280',
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'refund')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  time            TIME,
  description     TEXT NOT NULL DEFAULT '',
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory     TEXT,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_method  TEXT,
  merchant        TEXT,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);

-- ============================================================================
-- 5. BUDGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  period              TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (period IN ('weekly', 'monthly', 'yearly', 'custom')),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  alert_threshold_50  BOOLEAN NOT NULL DEFAULT FALSE,
  alert_threshold_75  BOOLEAN NOT NULL DEFAULT TRUE,
  alert_threshold_90  BOOLEAN NOT NULL DEFAULT TRUE,
  alert_threshold_100 BOOLEAN NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SAVINGS GOALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  target_amount         NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_date           DATE,
  monthly_contribution  NUMERIC(12,2),
  icon                  TEXT NOT NULL DEFAULT 'PiggyBank',
  color                 TEXT NOT NULL DEFAULT '#14b8a6',
  is_completed          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. SAVINGS CONTRIBUTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_contributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL CHECK (type IN ('contribution', 'withdrawal')),
  note        TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON savings_contributions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions"
  ON savings_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contributions"
  ON savings_contributions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contributions"
  ON savings_contributions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 8. RECURRING TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'refund')),
  amount              NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description         TEXT NOT NULL DEFAULT '',
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  frequency           TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date       DATE NOT NULL,
  last_processed_date DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  auto_create         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring transactions"
  ON recurring_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions"
  ON recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions"
  ON recurring_transactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions"
  ON recurring_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS: Auto-create profile & default categories on signup
-- ============================================================================

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  -- Insert default expense categories
  INSERT INTO categories (user_id, name, type, icon, color, sort_order, is_default) VALUES
    (NEW.id, 'Food & Dining',    'expense', 'UtensilsCrossed', '#EF4444',  1, TRUE),
    (NEW.id, 'Transport',        'expense', 'Car',             '#F97316',  2, TRUE),
    (NEW.id, 'Shopping',         'expense', 'ShoppingBag',     '#8B5CF6',  3, TRUE),
    (NEW.id, 'Bills & Utilities','expense', 'Receipt',         '#EC4899',  4, TRUE),
    (NEW.id, 'Entertainment',    'expense', 'Film',            '#06B6D4',  5, TRUE),
    (NEW.id, 'Health',           'expense', 'Heart',           '#10B981',  6, TRUE),
    (NEW.id, 'Education',        'expense', 'GraduationCap',   '#3B82F6',  7, TRUE),
    (NEW.id, 'Rent',             'expense', 'Home',            '#6366F1',  8, TRUE),
    (NEW.id, 'Groceries',        'expense', 'ShoppingCart',    '#84CC16',  9, TRUE),
    (NEW.id, 'Personal Care',    'expense', 'Sparkles',        '#D946EF', 10, TRUE),
    (NEW.id, 'Gifts & Donations','expense', 'Gift',            '#F43F5E', 11, TRUE),
    (NEW.id, 'Insurance',        'expense', 'Shield',          '#0EA5E9', 12, TRUE),
    (NEW.id, 'Other Expense',    'expense', 'MoreHorizontal',  '#6B7280', 13, TRUE);

  -- Insert default income categories
  INSERT INTO categories (user_id, name, type, icon, color, sort_order, is_default) VALUES
    (NEW.id, 'Salary',           'income', 'Briefcase',       '#10B981',  1, TRUE),
    (NEW.id, 'Freelance',        'income', 'Laptop',          '#14B8A6',  2, TRUE),
    (NEW.id, 'Business',         'income', 'Building',        '#8B5CF6',  3, TRUE),
    (NEW.id, 'Investments',      'income', 'TrendingUp',      '#3B82F6',  4, TRUE),
    (NEW.id, 'Rental Income',    'income', 'Home',            '#F97316',  5, TRUE),
    (NEW.id, 'Gifts Received',   'income', 'Gift',            '#EC4899',  6, TRUE),
    (NEW.id, 'Other Income',     'income', 'MoreHorizontal',  '#6B7280',  7, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
