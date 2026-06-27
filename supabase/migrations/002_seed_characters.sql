-- ============================================================
-- 002: 种子数据 — 36 角色
-- ============================================================

INSERT INTO characters (id, name_zh, name_en, ability_name, ability_desc, trigger_type, effect_type, effect_params) VALUES
(1,  '炼金术士',   'Alchemist',      '变形并移动',      '当我在主要移动中掷出1或2时，我可以改为移动4格。',                    'ON_ROLL',           'MOVE_SELF',         '{"condition": [1,2], "magnitude": 4}'),
(2,  '飞艇',       'Blimp',          '炸了它',          '第二个弯道之前开始回合时主要移动+3，之后-1。',                      'PASSIVE',           'BOOST_MAIN_MOVE',   '{"before_corner": 3, "after_corner": -1}'),
(3,  '教练',       'Coach',          '干得漂亮',        '我所在格子上的每个人的主要移动+1（包括我）。',                       'PASSIVE',           'BOOST_MAIN_MOVE',   '{"magnitude": 1, "scope": "same_space"}'),
(4,  '芭芭雅嘎',   'Baba Yaga',      '合法的',          '绊倒任何停在我格子上的赛车手，或当我停在他们格子上时绊倒他们。',     'ON_STOP',           'TRIP',              '{"mutual": true}'),
(5,  '半人马',     'Centaur',        '马蹄重击',        '当我经过一名赛车手时，他们后退2格。',                               'ON_PASS',           'MOVE_OTHER',        '{"magnitude": -2}'),
(6,  '模仿猫',     'Copy Cat',       '照搬',            '我持续拥有当前领先赛车手的能力。',                                   'PASSIVE',           'COPY_ABILITY',      '{"source": "lead"}'),
(7,  '香蕉',       'Banana',         '滑跤',            '我会绊倒任何经过我的赛车手。',                                       'ON_PASS',           'TRIP',              '{}'),
(8,  '啦啦队长',   'Cheerleader',    '加油加油',        '主要移动前可以让最后一名的赛车手移动2格，然后我移动1格。',           'BEFORE_MAIN_MOVE',  'MOVE_OTHER',        '{"target": "last_place", "magnitude": 2, "self_magnitude": 1}'),
(9,  '骰子贩子',   'Dicemonger',     '骰子交易',        '任何人每回合可以重掷一次。当别人重掷时我移动1格。',                 'PASSIVE',           'REROLL',            '{"limit": 1, "self_magnitude": 1}'),
(10, '决斗者',     'Duelist',        '决斗！',          '同格时发起决斗，双方掷骰，胜者前进2格。平局算我赢。',               'ON_SHARE_SPACE',    'DUEL',              '{"magnitude": 2}'),
(11, '天才',       'Genius',         '好好想想',        '预测自己主要移动掷出的点数。猜对则再获得一个回合。',                 'BEFORE_MAIN_MOVE',  'PREDICT',           '{"extra_turn": true}'),
(12, '起哄者',     'Heckler',        '幸灾乐祸',        '当赛车手结束回合时位移不超过1格，我移动2格。',                      'AFTER_MAIN_MOVE',   'MOVE_SELF',         '{"threshold": 1, "magnitude": 2}'),
(13, '蛋',         'Egg',            '搅乱',            '比赛前从牌堆抽3张选1张，获得其能力。',                              'BEFORE_RACE',       'COPY_ABILITY',      '{"draw": 3, "pick": 1}'),
(14, '黏黏怪',     'Gunk',           '黏住他们',        '其他赛车手的主要移动获得-1。',                                       'PASSIVE',           'REDUCE_MAIN_MOVE',  '{"magnitude": -1, "scope": "others"}'),
(15, '巨型宝宝',   'Huge Baby',      '真的巨大',        '无人能与我同格（起点除外）。被迫同格时放到我身后。',                 'PASSIVE',           'BLOCK_SPACE',       '{"except": "start"}'),
(16, '翻转蛙',     'Flip Flop',      '翻来翻去',        '可以跳过掷骰，改为与另一名赛车手交换位置（传送）。',                 'BEFORE_MAIN_MOVE',  'SWAP',              '{}'),
(17, '兔子',       'Hare',           '傲慢',            '主要移动+2。但若回合开始时独自领先则跳过主要移动。',                 'PASSIVE',           'BOOST_MAIN_MOVE',   '{"boost": 2, "skip_if_alone_in_lead": true}'),
(18, '催眠师',     'Hypnotist',      '嘶嘶嘶',          '主要移动前可以将一名赛车手传送到我的格子上。',                       'BEFORE_MAIN_MOVE',  'WARP',              '{"target": "my_space"}'),
(19, '尺蠖',       'Inchworm',       '蠕动',            '当别人主要移动掷出1时，他们跳过移动，我移动1格。',                   'ON_ROLL',           'SKIP_MAIN_MOVE',    '{"trigger_roll": 1, "self_magnitude": 1}'),
(20, '大长腿',     'Legs',           '慢跑',            '我可以跳过掷骰，改为移动5格。',                                       'BEFORE_MAIN_MOVE',  'MOVE_SELF',         '{"magnitude": 5, "skip_roll": true}'),
(21, '策划者',     'Mastermind',     '无所不知',        '第一次回合开始时预测冠军。猜对则比赛立即结束，我获第二名。',         'BEFORE_MAIN_MOVE',  'PREDICT',           '{"predict_winner": true, "reward": "second_place", "first_turn_only": true}'),
(22, '马屁精',     'Lackey',         '好的先生',        '当别人主要移动掷出6时，我在他们移动之前移动2格。',                   'ON_ROLL',           'MOVE_SELF',         '{"trigger_roll": 6, "magnitude": 2}'),
(23, '可爱输家',   'Loveable Loser', '呜呜呜',          '主要移动前如果我独自处于最后一名，获得1分。',                       'BEFORE_MAIN_MOVE',  'SCORE_CHIP',        '{"condition": "alone_in_last", "magnitude": 1}'),
(24, '大嘴巴',     'M.O.U.T.H.',     '咔嚓',            '当我停在恰好有一名赛车手的格子上时，淘汰对方。',                     'ON_STOP',           'ELIMINATE',         '{"condition": "exactly_one_other"}'),
(25, '跳蛙',       'Leaptoad',       '跳蛙',            '移动时跳过有其他赛车手的格子。',                                       'PASSIVE',           'MOVE_SELF',         '{"skip_occupied": true}'),
(26, '魔术师',     'Magician',       '噗',              '我可以重掷主要移动最多两次。',                                         'ON_ROLL',           'REROLL',            '{"limit": 2}'),
(27, '派对动物',   'Party Animal',   '动物磁力',        '主要移动前所有赛车手向我移动1格。同格每人给主要移动+1。',           'BEFORE_MAIN_MOVE',  'WARP',              '{"pull_magnitude": 1, "boost_per_racer": 1}'),
(28, '火箭科学家', 'Rocket Scientist','轰隆',           '为主要移动掷骰后可将数字翻倍，但会被绊倒。',                         'ON_ROLL',           'BOOST_MAIN_MOVE',   '{"multiplier": 2, "self_trip": true}'),
(29, '西西弗斯',   'Sisyphus',       '继续推',          '赛前获4分。主要移动掷出6时传送到起点并失去1分。',                    'BEFORE_RACE',       'SCORE_CHIP',        '{"start_chips": 4, "trigger_roll": 6, "penalty": 1}'),
(30, '浪漫主义者', 'Romantic',       '啊，爱情！',      '当任何人停在恰好有另一名赛车手的格子上时，我移动2格。',               'ON_STOP',           'MOVE_SELF',         '{"magnitude": 2, "condition": "exact_two_racers"}'),
(31, '船长',       'Skipper',        '咸狗',            '当任何人在主要移动中掷出1时，我按回合顺序接下来行动。',              'ON_ROLL',           'TURN_ORDER',        '{"trigger_roll": 1}'),
(32, '蹭蹭狗',     'Scoocher',       '蹭蹭',            '当另一名赛车手的能力发动时，我移动1格。',                             'ON_OTHER_ABILITY',  'MOVE_SELF',         '{"magnitude": 1}'),
(33, '较真鬼',     'Stickler',       '其实……',        '其他赛车手只能通过精确移动到所需格数来冲过终点线。',                 'PASSIVE',           'BLOCK_SPACE',       '{"exact_finish_required": true}'),
(34, '吸盘鱼',     'Suckerfish',     '吸住了！',        '当我所在格子的赛车手移动时，我可以移动到他们的新格子。',              'ON_STOP',           'MOVE_SELF',         '{"follow": true}'),
(35, '电灯泡',     'Third Wheel',    '滚过去',          '主要移动前可以传送到恰好有2名赛车手的格子上。',                      'BEFORE_MAIN_MOVE',  'WARP',              '{"condition": "space_with_exact_2_racers"}'),
(36, '双胞胎',     'Twin',           '双重蘸取',        '比赛开始前可以选择一名前一场获胜的赛车手并使用其能力。',              'BEFORE_RACE',       'COPY_ABILITY',      '{"copy_previous_winner": true}');

-- 重置序列
SELECT setval('characters_id_seq', 36);
