-- ============================================
-- 網站回饋中心資料表（問題回報 / 許願池 / 更新公告）
-- 使用方式：Supabase 後台 → 左側 SQL Editor → New query → 貼上全部 → Run
-- ============================================

-- 1. 問題回報
create table if not exists feedback_reports (
  id          bigint generated always as identity primary key,
  type        text,
  description text,
  prop        text,
  contact     text,
  status      text default '未處理',
  created_at  timestamptz default now()
);

-- 2. 許願池
create table if not exists feedback_wishes (
  id          bigint generated always as identity primary key,
  type        text,
  content     text,
  contact     text,
  status      text default '未處理',
  created_at  timestamptz default now()
);

-- 3. 更新公告
create table if not exists feedback_announcements (
  id          bigint generated always as identity primary key,
  date        text,
  title       text,
  body        text,
  created_at  timestamptz default now()
);

-- 開啟 RLS 並允許前台/後台讀寫（比照 properties 表）
alter table feedback_reports        enable row level security;
alter table feedback_wishes         enable row level security;
alter table feedback_announcements  enable row level security;

drop policy if exists "public all reports"       on feedback_reports;
drop policy if exists "public all wishes"        on feedback_wishes;
drop policy if exists "public all announcements" on feedback_announcements;

create policy "public all reports"       on feedback_reports        for all using (true) with check (true);
create policy "public all wishes"        on feedback_wishes         for all using (true) with check (true);
create policy "public all announcements" on feedback_announcements  for all using (true) with check (true);
