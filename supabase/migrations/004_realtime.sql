-- ============================================================
-- 004: 开启 Supabase Realtime 订阅
-- ============================================================

-- 对核心表开启实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE player_racers;
ALTER PUBLICATION supabase_realtime ADD TABLE race_states;
ALTER PUBLICATION supabase_realtime ADD TABLE race_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
