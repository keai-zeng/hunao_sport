-- ============================================================
-- 胡闹运动会 数据库迁移
-- 001: 初始表结构
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- characters: 36 角色静态数据
-- -------------------------------------------------------
CREATE TABLE characters (
  id              SERIAL PRIMARY KEY,
  name_zh         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  ability_name    TEXT NOT NULL,
  ability_desc    TEXT NOT NULL,
  trigger_type    TEXT NOT NULL,  -- ON_ROLL / ON_PASS / ON_STOP / ON_OTHER_ABILITY / BEFORE_MAIN_MOVE / AFTER_MAIN_MOVE / ON_SHARE_SPACE / PASSIVE / BEFORE_RACE / ON_LEAD
  effect_type     TEXT NOT NULL,  -- MOVE_SELF / MOVE_OTHER / WARP / TRIP / REROLL / ELIMINATE / BOOST_MAIN_MOVE / REDUCE_MAIN_MOVE / PREDICT / SKIP_MAIN_MOVE / DUEL / SWAP / COPY_ABILITY / SCORE_CHIP / TURN_ORDER / BLOCK_SPACE
  effect_params   JSONB DEFAULT '{}'::jsonb
);

-- -------------------------------------------------------
-- games: 游戏房间
-- -------------------------------------------------------
CREATE TYPE game_status AS ENUM (
  'waiting', 'drafting', 'selecting_racer', 'racing', 'race_end', 'finished'
);

CREATE TYPE game_variant AS ENUM (
  'standard', 'two_player', 'three_player_double'
);

CREATE TYPE track_side AS ENUM (
  'mild', 'wild'
);

CREATE TABLE games (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT UNIQUE NOT NULL,
  status              game_status DEFAULT 'waiting'::game_status,
  variant             game_variant DEFAULT 'standard'::game_variant,
  current_race        INT DEFAULT 1 CHECK (current_race BETWEEN 1 AND 4),
  track_side          track_side DEFAULT 'mild'::track_side,
  current_player_id   UUID,
  draft_batch         INT DEFAULT 1 CHECK (draft_batch BETWEEN 1 AND 2),
  draft_direction     TEXT DEFAULT 'forward',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- game_players: 玩家-游戏关联
-- -------------------------------------------------------
CREATE TABLE game_players (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  nickname        TEXT NOT NULL,
  seat_order      INT NOT NULL,
  draft_position  INT,
  total_score     INT DEFAULT 0,
  is_host         BOOLEAN DEFAULT false,
  is_ready        BOOLEAN DEFAULT false,
  UNIQUE(game_id, user_id)
);

-- 回填 games.current_player_id 外键（循环依赖，先创建后添加）
ALTER TABLE games
  ADD CONSTRAINT fk_current_player
  FOREIGN KEY (current_player_id) REFERENCES game_players(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- player_racers: 轮抽获得的角色
-- -------------------------------------------------------
CREATE TABLE player_racers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  character_id  INT NOT NULL REFERENCES characters(id),
  used_in_race  INT DEFAULT 0 CHECK (used_in_race BETWEEN 0 AND 4),
  UNIQUE(game_id, player_id, character_id)
);

-- -------------------------------------------------------
-- race_states: 每场比赛状态
-- -------------------------------------------------------
CREATE TYPE race_status AS ENUM (
  'selecting', 'racing', 'finished'
);

CREATE TABLE race_states (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id                 UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  race_number             INT NOT NULL CHECK (race_number BETWEEN 1 AND 4),
  status                  race_status DEFAULT 'selecting'::race_status,
  first_place_player_id   UUID REFERENCES game_players(id) ON DELETE SET NULL,
  second_place_player_id  UUID REFERENCES game_players(id) ON DELETE SET NULL,
  UNIQUE(game_id, race_number)
);

-- -------------------------------------------------------
-- race_participants: 每场比赛的参赛角色
-- -------------------------------------------------------
CREATE TABLE race_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id         UUID NOT NULL REFERENCES race_states(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  character_id    INT NOT NULL REFERENCES characters(id),
  position        INT DEFAULT 0 CHECK (position BETWEEN 0 AND 30),
  is_tripped      BOOLEAN DEFAULT false,
  is_eliminated   BOOLEAN DEFAULT false,
  finish_order    INT CHECK (finish_order IN (1, 2)),
  UNIQUE(race_id, player_id),
  UNIQUE(race_id, finish_order)
);

-- -------------------------------------------------------
-- track_spaces: 赛道格子配置
-- -------------------------------------------------------
CREATE TABLE track_spaces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_side      track_side NOT NULL,
  space_index     INT NOT NULL CHECK (space_index BETWEEN 0 AND 30),
  has_arrow       BOOLEAN DEFAULT false,
  arrow_direction TEXT,  -- 'forward' / 'backward'
  arrow_distance  INT,
  has_star        BOOLEAN DEFAULT false,
  has_trip        BOOLEAN DEFAULT false,
  is_finish       BOOLEAN DEFAULT false,
  UNIQUE(track_side, space_index)
);

-- -------------------------------------------------------
-- game_events: 事件日志
-- -------------------------------------------------------
CREATE TYPE game_event_type AS ENUM (
  'ROLL', 'MAIN_MOVE', 'STEP', 'PASS', 'STOP',
  'TRACK_EFFECT', 'ABILITY_TRIGGER', 'EFFECT',
  'TRIP', 'WARP', 'ELIMINATE', 'FINISH', 'SCORE'
);

CREATE TABLE game_events (
  id                BIGSERIAL PRIMARY KEY,
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  race_id           UUID NOT NULL REFERENCES race_states(id) ON DELETE CASCADE,
  sequence          INT NOT NULL,
  event_type        game_event_type NOT NULL,
  source_player_id  UUID REFERENCES game_players(id) ON DELETE SET NULL,
  target_player_id  UUID REFERENCES game_players(id) ON DELETE SET NULL,
  payload           JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_game_events_game_race ON game_events(game_id, race_id);
CREATE INDEX idx_game_events_sequence ON game_events(game_id, race_id, sequence);

-- -------------------------------------------------------
-- 辅助函数：生成 6 位加入码
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_game_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM games WHERE games.code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
