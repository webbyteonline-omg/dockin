-- Pulse v5 — income vs expense tracking on the `expenses` table.
--
-- Rather than a separate `income` table, income rows live in the same
-- `expenses` table distinguished by `transaction_type`. This keeps the
-- existing date-range queries, activity log, and CSV export working
-- unchanged for both kinds of transaction. Income rows store their source
-- (Pocket Money / Part-time / Transfer / Other) in the `category` column so
-- the existing `category` index/filtering machinery is reused as-is.

alter table public.expenses
  add column if not exists transaction_type text
    not null default 'expense'
    check (transaction_type in ('expense', 'income'));

-- Widen the category check to also accept income sources. Postgres has no
-- "alter constraint", so drop + recreate.
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses
  add constraint expenses_category_check check (
    category in (
      'food', 'travel', 'shopping', 'bills', 'education', 'health', 'entertainment', 'others',
      'pocket_money', 'part_time', 'transfer', 'other_income'
    )
  );

create index if not exists idx_expenses_user_type_date
  on public.expenses(user_id, transaction_type, date desc);
