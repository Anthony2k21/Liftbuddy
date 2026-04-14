-- ============================================================
-- No1Assist — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- Single table that maps each localStorage key to cloud storage.
-- One row per (user, key) pair; value stored as JSONB.
CREATE TABLE IF NOT EXISTS user_data (
  user_id    uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  key        text        NOT NULL,
  value      jsonb       NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER user_data_updated_at
BEFORE UPDATE ON user_data
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "select_own" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "insert_own" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "update_own" ON user_data
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "delete_own" ON user_data
  FOR DELETE USING (auth.uid() = user_id);
