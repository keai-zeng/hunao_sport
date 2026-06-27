/**
 * 胡闹运动会 — 核心类型定义
 */

// ============================================================
// 游戏状态
// ============================================================

export type GameStatus =
  | 'waiting'
  | 'drafting'
  | 'selecting_racer'
  | 'racing'
  | 'race_end'
  | 'finished'

export type GameVariant =
  | 'standard'
  | 'two_player'
  | 'three_player_double'

export type TrackSide = 'mild' | 'wild'

export type RaceStatus = 'selecting' | 'racing' | 'finished'

// ============================================================
// 角色 & 技能
// ============================================================

export type TriggerType =
  | 'ON_ROLL'
  | 'ON_PASS'
  | 'ON_STOP'
  | 'ON_OTHER_ABILITY'
  | 'BEFORE_MAIN_MOVE'
  | 'AFTER_MAIN_MOVE'
  | 'ON_SHARE_SPACE'
  | 'PASSIVE'
  | 'BEFORE_RACE'
  | 'ON_LEAD'

export type EffectType =
  | 'MOVE_SELF'
  | 'MOVE_OTHER'
  | 'WARP'
  | 'TRIP'
  | 'REROLL'
  | 'ELIMINATE'
  | 'BOOST_MAIN_MOVE'
  | 'REDUCE_MAIN_MOVE'
  | 'PREDICT'
  | 'SKIP_MAIN_MOVE'
  | 'DUEL'
  | 'SWAP'
  | 'COPY_ABILITY'
  | 'SCORE_CHIP'
  | 'TURN_ORDER'
  | 'BLOCK_SPACE'

export interface Character {
  id: number
  nameZh: string
  nameEn: string
  abilityName: string
  abilityDesc: string
  triggerType: TriggerType
  effectType: EffectType
  effectParams: Record<string, unknown>
}

// ============================================================
// 玩家 & 游戏
// ============================================================

export interface Player {
  id: string
  nickname: string
  seatOrder: number
  draftPosition?: number
  totalScore: number
  isHost: boolean
  isReady: boolean
}

export interface Game {
  id: string
  code: string
  status: GameStatus
  variant: GameVariant
  currentRace: number
  trackSide: TrackSide
  currentPlayerId: string | null
  draftBatch: number
  draftDirection: 'forward' | 'backward'
  players: Player[]
  createdAt: string
}

// ============================================================
// 轮抽
// ============================================================

export interface DraftState {
  batch: number // 1-2
  direction: 'forward' | 'backward'
  currentPickerIndex: number
  availableCharacters: Character[]
  picks: Map<string, Character[]> // playerId → picked characters
}

// ============================================================
// 比赛
// ============================================================

export interface RaceParticipant {
  id: string
  playerId: string
  characterId: number
  character: Character
  position: number     // 0-30
  isTripped: boolean
  isEliminated: boolean
  finishOrder: number | null  // 1=金牌, 2=银牌
}

export interface RaceState {
  id: string
  raceNumber: number
  status: RaceStatus
  trackSide: TrackSide
  participants: RaceParticipant[]
  firstPlacePlayerId: string | null
  secondPlacePlayerId: string | null
}

// ============================================================
// 事件引擎
// ============================================================

export type GameEventType =
  | 'ROLL'
  | 'MAIN_MOVE'
  | 'STEP'
  | 'PASS'
  | 'STOP'
  | 'TRACK_EFFECT'
  | 'ABILITY_TRIGGER'
  | 'EFFECT'
  | 'TRIP'
  | 'WARP'
  | 'ELIMINATE'
  | 'FINISH'
  | 'SCORE'

/** 事件优先级：赛道格 → 当前玩家 → 其他玩家(顺时针) */
export type EventPriority = 0 | 1 | 2

export interface GameEvent {
  type: GameEventType
  priority: EventPriority
  sourcePlayerId: string
  targetPlayerId?: string
  payload: Record<string, unknown>
}

// ============================================================
// 移动
// ============================================================

export type MoveType = 'main_move' | 'ability_move' | 'warp' | 'arrow_move'

export interface MoveResult {
  fromPosition: number
  toPosition: number
  moveType: MoveType
  passedRacers: string[]        // playerIds passed during move
  stoppedWithRacers: string[]   // playerIds sharing destination space
  isFinish: boolean
}

// ============================================================
// 积分
// ============================================================

export interface ScoreBreakdown {
  gold: number
  silver: number
  bronze: number
  total: number
}

/** 第1-4场金银牌分值 */
export const GOLD_VALUES = [3, 4, 4, 5] as const
export const SILVER_VALUES = [1, 2, 2, 1] as const

// ============================================================
// 赛道
// ============================================================

export interface TrackSpace {
  spaceIndex: number
  hasArrow: boolean
  arrowDirection: 'forward' | 'backward' | null
  arrowDistance: number | null
  hasStar: boolean
  hasTrip: boolean
  isFinish: boolean
}

// ============================================================
// 常量
// ============================================================

export const TRACK_LENGTH = 30       // 终点位置
export const TURN_TIMEOUT_MS = 3 * 60 * 1000  // 3 分钟
export const MAX_LOOP_ITERATIONS = 10 // 无限循环检测上限
