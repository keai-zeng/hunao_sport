-- ============================================================
-- 006: 添加 max_players 字段
-- ============================================================
ALTER TABLE games ADD COLUMN IF NOT EXISTS max_players INT DEFAULT 6;
