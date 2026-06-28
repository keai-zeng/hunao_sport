-- ============================================================
-- 005: 关闭 RLS（开发阶段，允许匿名访问）
-- ============================================================

ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_racers DISABLE ROW LEVEL SECURITY;
ALTER TABLE race_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE race_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_events DISABLE ROW LEVEL SECURITY;
