-- ============================================================
-- 003: 种子数据 — 赛道格子（Mild + Wild）
-- ============================================================

-- Mild 赛道：纯 30 格，无任何特殊效果
INSERT INTO track_spaces (track_side, space_index, is_finish)
SELECT 'mild', i, (i = 30)
FROM generate_series(0, 30) AS i;

-- Wild 赛道：带箭头、星星、绊倒
INSERT INTO track_spaces (track_side, space_index, has_arrow, arrow_direction, arrow_distance, has_star, has_trip, is_finish) VALUES
('wild', 0,  false, NULL,   NULL, false, false, false),   -- 起点
('wild', 1,  false, NULL,   NULL, true,  false, false),   -- ⭐ 星星 +1
('wild', 2,  false, NULL,   NULL, false, false, false),
('wild', 3,  false, NULL,   NULL, false, false, false),
('wild', 4,  false, NULL,   NULL, false, false, false),
('wild', 5,  false, NULL,   NULL, false, true,  false),   -- 🪨 绊倒
('wild', 6,  false, NULL,   NULL, false, false, false),
('wild', 7,  true,  'forward',  3,  false, false, false), -- ➡️ 箭头 +3
('wild', 8,  false, NULL,   NULL, false, false, false),
('wild', 9,  false, NULL,   NULL, false, false, false),
('wild', 10, false, NULL,   NULL, false, false, false),
('wild', 11, true,  'forward',  1,  false, false, false), -- ➡️ 箭头 +1
('wild', 12, false, NULL,   NULL, false, false, false),
('wild', 13, false, NULL,   NULL, true,  false, false),   -- ⭐ 星星 +1
('wild', 14, false, NULL,   NULL, false, false, false),
('wild', 15, true,  'backward', 4,  false, false, false), -- ⬅️ 箭头 -4
('wild', 16, false, NULL,   NULL, false, true,  false),   -- 🪨 绊倒
('wild', 17, false, NULL,   NULL, false, false, false),
('wild', 18, false, NULL,   NULL, false, false, false),
('wild', 19, false, NULL,   NULL, false, false, false),
('wild', 20, false, NULL,   NULL, false, false, false),
('wild', 21, false, NULL,   NULL, false, false, false),
('wild', 22, true,  'forward',  2,  false, false, false), -- ➡️ 箭头 +2
('wild', 23, true,  'backward', 2,  false, false, false), -- ⬅️ 箭头 -2
('wild', 24, false, NULL,   NULL, false, false, false),
('wild', 25, false, NULL,   NULL, false, true,  false),   -- 🪨 绊倒
('wild', 26, false, NULL,   NULL, false, false, false),
('wild', 27, false, NULL,   NULL, false, false, false),
('wild', 28, false, NULL,   NULL, false, false, false),
('wild', 29, false, NULL,   NULL, false, false, false),
('wild', 30, false, NULL,   NULL, false, false, true);    -- 🏁 终点
