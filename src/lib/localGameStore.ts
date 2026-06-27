/**
 * LocalGameStore — 本地热座模式游戏状态管理
 *
 * 不依赖 Supabase，完全在浏览器内存中运行完整游戏。
 * 串联：GameEngine + DraftEngine + EventEngine + 36角色技能
 */

import { GameEngine } from './gameEngine'
import { registerAllAbilities } from './abilities'
import type {
  Player, Character, RaceState, RaceParticipant,
  GameEvent, TrackSide, GameVariant, GameStatus,
} from './types'
import { GOLD_VALUES, SILVER_VALUES } from './types'

// ============================================================
// 种子角色数据（36个）
// ============================================================

export const ALL_CHARACTERS: Character[] = [
  { id: 1,  nameZh: '炼金术士',   nameEn: 'Alchemist',      abilityName: '变形并移动',   abilityDesc: '掷出1或2时改为移动4格',                             triggerType: 'ON_ROLL',          effectType: 'MOVE_SELF',        effectParams: { condition: [1,2], magnitude: 4 } },
  { id: 2,  nameZh: '飞艇',       nameEn: 'Blimp',          abilityName: '炸了它',       abilityDesc: '弯道前+3/后-1',                                     triggerType: 'PASSIVE',          effectType: 'BOOST_MAIN_MOVE',  effectParams: { beforeCorner: 3, afterCorner: -1 } },
  { id: 3,  nameZh: '教练',       nameEn: 'Coach',          abilityName: '干得漂亮',     abilityDesc: '同格全员main move +1',                                triggerType: 'PASSIVE',          effectType: 'BOOST_MAIN_MOVE',  effectParams: { magnitude: 1, scope: 'same_space' } },
  { id: 4,  nameZh: '芭芭雅嘎',   nameEn: 'Baba Yaga',      abilityName: '合法的',       abilityDesc: '同格时互相绊倒',                                      triggerType: 'ON_STOP',          effectType: 'TRIP',             effectParams: { mutual: true } },
  { id: 5,  nameZh: '半人马',     nameEn: 'Centaur',        abilityName: '马蹄重击',     abilityDesc: '经过他人时踢退2格',                                   triggerType: 'ON_PASS',          effectType: 'MOVE_OTHER',       effectParams: { magnitude: -2 } },
  { id: 6,  nameZh: '模仿猫',     nameEn: 'Copy Cat',       abilityName: '照搬',         abilityDesc: '持续拥有领先者的能力',                                 triggerType: 'PASSIVE',          effectType: 'COPY_ABILITY',     effectParams: { source: 'lead' } },
  { id: 7,  nameZh: '香蕉',       nameEn: 'Banana',         abilityName: '滑跤',         abilityDesc: '绊倒经过我的赛车手',                                   triggerType: 'ON_PASS',          effectType: 'TRIP',             effectParams: {} },
  { id: 8,  nameZh: '啦啦队长',   nameEn: 'Cheerleader',    abilityName: '加油加油',     abilityDesc: '最后一名+2/自己+1',                                   triggerType: 'BEFORE_MAIN_MOVE', effectType: 'MOVE_OTHER',       effectParams: { target: 'last_place', magnitude: 2, selfMagnitude: 1 } },
  { id: 9,  nameZh: '骰子贩子',   nameEn: 'Dicemonger',     abilityName: '骰子交易',     abilityDesc: '别人可重掷/重掷时我+1',                                triggerType: 'PASSIVE',          effectType: 'REROLL',           effectParams: { limit: 1, selfMagnitude: 1 } },
  { id: 10, nameZh: '决斗者',     nameEn: 'Duelist',        abilityName: '决斗！',       abilityDesc: '同格决斗掷骰，胜者+2',                                  triggerType: 'ON_SHARE_SPACE',   effectType: 'DUEL',             effectParams: { magnitude: 2 } },
  { id: 11, nameZh: '天才',       nameEn: 'Genius',         abilityName: '好好想想',     abilityDesc: '预测掷骰点数，猜对再来一回合',                           triggerType: 'BEFORE_MAIN_MOVE', effectType: 'PREDICT',          effectParams: { extraTurn: true } },
  { id: 12, nameZh: '起哄者',     nameEn: 'Heckler',        abilityName: '幸灾乐祸',     abilityDesc: '别人位移≤1格时我+2',                                  triggerType: 'AFTER_MAIN_MOVE',  effectType: 'MOVE_SELF',        effectParams: { threshold: 1, magnitude: 2 } },
  { id: 13, nameZh: '蛋',         nameEn: 'Egg',            abilityName: '搅乱',         abilityDesc: '赛前抽3选1复制能力',                                   triggerType: 'BEFORE_RACE',      effectType: 'COPY_ABILITY',     effectParams: { draw: 3, pick: 1 } },
  { id: 14, nameZh: '黏黏怪',     nameEn: 'Gunk',           abilityName: '黏住他们',     abilityDesc: '其他赛车手main move -1',                               triggerType: 'PASSIVE',          effectType: 'REDUCE_MAIN_MOVE', effectParams: { magnitude: -1, scope: 'others' } },
  { id: 15, nameZh: '巨型宝宝',   nameEn: 'Huge Baby',      abilityName: '真的巨大',     abilityDesc: '无人能同格（起点除外）',                                 triggerType: 'PASSIVE',          effectType: 'BLOCK_SPACE',      effectParams: { except: 'start' } },
  { id: 16, nameZh: '翻转蛙',     nameEn: 'Flip Flop',      abilityName: '翻来翻去',     abilityDesc: '跳过掷骰，与人交换位置',                                 triggerType: 'BEFORE_MAIN_MOVE', effectType: 'SWAP',             effectParams: {} },
  { id: 17, nameZh: '兔子',       nameEn: 'Hare',           abilityName: '傲慢',         abilityDesc: 'main move +2，独自领先时跳过',                         triggerType: 'PASSIVE',          effectType: 'BOOST_MAIN_MOVE',  effectParams: { boost: 2, skipIfAloneInLead: true } },
  { id: 18, nameZh: '催眠师',     nameEn: 'Hypnotist',      abilityName: '嘶嘶嘶',       abilityDesc: 'main move前传送到我格',                                triggerType: 'BEFORE_MAIN_MOVE', effectType: 'WARP',             effectParams: { target: 'my_space' } },
  { id: 19, nameZh: '尺蠖',       nameEn: 'Inchworm',       abilityName: '蠕动',         abilityDesc: '别人掷1时跳过+我+1',                                   triggerType: 'ON_ROLL',          effectType: 'SKIP_MAIN_MOVE',   effectParams: { triggerRoll: 1, selfMagnitude: 1 } },
  { id: 20, nameZh: '大长腿',     nameEn: 'Legs',           abilityName: '慢跑',         abilityDesc: '不掷骰直接走5格',                                      triggerType: 'BEFORE_MAIN_MOVE', effectType: 'MOVE_SELF',        effectParams: { magnitude: 5, skipRoll: true } },
  { id: 21, nameZh: '策划者',     nameEn: 'Mastermind',     abilityName: '无所不知',     abilityDesc: '首回合预测冠军，猜对直接第2',                            triggerType: 'BEFORE_MAIN_MOVE', effectType: 'PREDICT',          effectParams: { predictWinner: true, firstTurnOnly: true } },
  { id: 22, nameZh: '马屁精',     nameEn: 'Lackey',         abilityName: '好的先生',     abilityDesc: '别人掷6时我先+2',                                     triggerType: 'ON_ROLL',          effectType: 'MOVE_SELF',        effectParams: { triggerRoll: 6, magnitude: 2 } },
  { id: 23, nameZh: '可爱输家',   nameEn: 'Loveable Loser', abilityName: '呜呜呜',       abilityDesc: '独自最后时+1分',                                       triggerType: 'BEFORE_MAIN_MOVE', effectType: 'SCORE_CHIP',       effectParams: { condition: 'alone_in_last', magnitude: 1 } },
  { id: 24, nameZh: '大嘴巴',     nameEn: 'M.O.U.T.H.',     abilityName: '咔嚓',         abilityDesc: '停在恰好1人格时淘汰对方',                                triggerType: 'ON_STOP',          effectType: 'ELIMINATE',        effectParams: { condition: 'exactly_one_other' } },
  { id: 25, nameZh: '跳蛙',       nameEn: 'Leaptoad',       abilityName: '跳蛙',         abilityDesc: '移动时跳过有人格子',                                     triggerType: 'PASSIVE',          effectType: 'MOVE_SELF',        effectParams: { skipOccupied: true } },
  { id: 26, nameZh: '魔术师',     nameEn: 'Magician',       abilityName: '噗',           abilityDesc: '可重掷最多2次',                                        triggerType: 'ON_ROLL',          effectType: 'REROLL',           effectParams: { limit: 2 } },
  { id: 27, nameZh: '派对动物',   nameEn: 'Party Animal',   abilityName: '动物磁力',     abilityDesc: '全体向我移动1+同格加成',                                 triggerType: 'BEFORE_MAIN_MOVE', effectType: 'WARP',             effectParams: { pullMagnitude: 1, boostPerRacer: 1 } },
  { id: 28, nameZh: '火箭科学家', nameEn: 'Rocket Scientist', abilityName: '轰隆',      abilityDesc: '掷骰翻倍+绊倒',                                        triggerType: 'ON_ROLL',          effectType: 'BOOST_MAIN_MOVE',  effectParams: { multiplier: 2, selfTrip: true } },
  { id: 29, nameZh: '西西弗斯',   nameEn: 'Sisyphus',       abilityName: '继续推',       abilityDesc: '赛前4分/掷6回起点扣1',                                  triggerType: 'BEFORE_RACE',      effectType: 'SCORE_CHIP',       effectParams: { startChips: 4, triggerRoll: 6, penalty: 1 } },
  { id: 30, nameZh: '浪漫主义者', nameEn: 'Romantic',       abilityName: '啊，爱情！',   abilityDesc: '2人同格时我+2',                                        triggerType: 'ON_STOP',          effectType: 'MOVE_SELF',        effectParams: { magnitude: 2, condition: 'exact_two_racers' } },
  { id: 31, nameZh: '船长',       nameEn: 'Skipper',        abilityName: '咸狗',         abilityDesc: '别人掷1时我插队',                                       triggerType: 'ON_ROLL',          effectType: 'TURN_ORDER',       effectParams: { triggerRoll: 1 } },
  { id: 32, nameZh: '蹭蹭狗',     nameEn: 'Scoocher',       abilityName: '蹭蹭',         abilityDesc: '别人技能触发时我+1',                                     triggerType: 'ON_OTHER_ABILITY', effectType: 'MOVE_SELF',        effectParams: { magnitude: 1 } },
  { id: 33, nameZh: '较真鬼',     nameEn: 'Stickler',       abilityName: '其实……',     abilityDesc: '必须精确到达才能冲线',                                    triggerType: 'PASSIVE',          effectType: 'BLOCK_SPACE',      effectParams: { exactFinishRequired: true } },
  { id: 34, nameZh: '吸盘鱼',     nameEn: 'Suckerfish',     abilityName: '吸住了！',     abilityDesc: '同格者移动时跟随',                                       triggerType: 'ON_STOP',          effectType: 'MOVE_SELF',        effectParams: { follow: true } },
  { id: 35, nameZh: '电灯泡',     nameEn: 'Third Wheel',    abilityName: '滚过去',       abilityDesc: '传送到恰好2人格',                                       triggerType: 'BEFORE_MAIN_MOVE', effectType: 'WARP',             effectParams: { condition: 'space_with_exact_2_racers' } },
  { id: 36, nameZh: '双胞胎',     nameEn: 'Twin',           abilityName: '双重蘸取',     abilityDesc: '赛前复制前一场冠军能力',                                  triggerType: 'BEFORE_RACE',      effectType: 'COPY_ABILITY',     effectParams: { copyPreviousWinner: true } },
]

// ============================================================
// 游戏状态
// ============================================================

interface BronzeScores { [playerId: string]: number }
interface RaceResult {
  raceNumber: number
  firstPlace?: string
  secondPlace?: string
  bronzeScores: BronzeScores
}

export interface LocalGameState {
  players: Player[]
  variant: GameVariant
  status: GameStatus
  currentRace: number
  trackSide: TrackSide
  currentPlayerIndex: number
  draftPicks: Map<string, Character[]>
  raceParticipants: RaceParticipant[]
  raceResults: RaceResult[]
  events: GameEvent[]
  bronzeScores: BronzeScores
}

export class LocalGameStore {
  private engine = new GameEngine()
  state: LocalGameState

  constructor() {
    // 注册全部 36 角色技能
    registerAllAbilities(this.engine)

    this.state = {
      players: [],
      variant: 'standard',
      status: 'waiting',
      currentRace: 1,
      trackSide: 'mild',
      currentPlayerIndex: 0,
      draftPicks: new Map(),
      raceParticipants: [],
      raceResults: [],
      events: [],
      bronzeScores: {},
    }
  }

  /** 添加玩家 */
  addPlayer(nickname: string): Player {
    const player: Player = {
      id: crypto.randomUUID(),
      nickname,
      seatOrder: this.state.players.length,
      totalScore: 0,
      isHost: this.state.players.length === 0,
      isReady: true,
    }
    this.state.players.push(player)
    this.state.draftPicks.set(player.id, [])
    return player
  }

  /** 开始轮抽 */
  startDraft(): Character[][] {
    const count = this.state.players.length
    const chars = [...ALL_CHARACTERS].sort(() => Math.random() - 0.5)
    const batch1 = chars.slice(0, count * 2)
    const batch2 = chars.slice(count * 2, count * 4)
    this.state.status = 'drafting'
    return [batch1, batch2]
  }

  /** 玩家轮抽选择 */
  draftPick(playerId: string, characterId: number): boolean {
    const picked = this.state.draftPicks.get(playerId)
    if (!picked || picked.length >= 4) return false
    const char = ALL_CHARACTERS.find(c => c.id === characterId)
    if (!char) return false
    picked.push(char)
    this.state.draftPicks.set(playerId, picked)

    // 所有人选完4个 → 进入选人阶段
    const allDone = [...this.state.draftPicks.values()].every(p => p.length >= 4)
    if (allDone) {
      this.state.status = 'selecting_racer'
    }
    return true
  }

  /** 赛前选人：玩家选择本场出战的角色 */
  selectRacer(playerId: string, characterId: number): boolean {
    const picks = this.state.draftPicks.get(playerId)
    if (!picks) return false
    const char = picks.find(c => c.id === characterId)
    if (!char) return false

    // 检查是否已被本场使用
    const alreadyUsed = this.state.raceParticipants.some(
      p => p.playerId === playerId
    )
    if (alreadyUsed) return false

    const participant: RaceParticipant = {
      id: crypto.randomUUID(),
      playerId,
      characterId: char.id,
      character: char,
      position: 0,
      isTripped: false,
      isEliminated: false,
      finishOrder: null,
    }
    this.state.raceParticipants.push(participant)

    // 所有人选完 → 开始比赛
    if (this.state.raceParticipants.length >= this.state.players.length) {
      this.state.status = 'racing'
    }
    return true
  }

  /** 执行当前玩家的回合 */
  executeCurrentTurn(): TurnResult {
    const race = this.getCurrentRaceState()
    const playerId = this.state.players[this.state.currentPlayerIndex].id

    const result = this.engine.executeTurn(
      race,
      playerId,
      this.state.trackSide,
      (event) => {
        this.state.events.push(event)
        // 收集铜分
        if (event.type === 'SCORE' && event.payload.scoreType === 'bronze') {
          const pts = event.payload.points as number
          this.state.bronzeScores[event.sourcePlayerId] =
            (this.state.bronzeScores[event.sourcePlayerId] ?? 0) + pts
        }
      }
    )

    // 下一个玩家（顺时针）
    this.advanceTurn()

    // 比赛结束？
    if (result.raceFinished) {
      this.finishRace(result)
    }

    return result
  }

  private advanceTurn(): void {
    const alive = this.state.raceParticipants.filter(
      p => !p.isEliminated && p.finishOrder === null
    )
    if (alive.length <= 1) return

    // 找下一个活着的玩家
    for (let i = 0; i < this.state.players.length; i++) {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length
      const pid = this.state.players[this.state.currentPlayerIndex].id
      if (alive.some(p => p.playerId === pid)) break
    }
  }

  private finishRace(result: TurnResult): void {
    const raceNum = this.state.currentRace
    this.state.raceResults.push({
      raceNumber: raceNum,
      firstPlace: result.firstPlace,
      secondPlace: result.secondPlace,
      bronzeScores: { ...this.state.bronzeScores },
    })

    // 更新总分
    if (result.firstPlace) this.addScore(result.firstPlace, 'gold', raceNum)
    if (result.secondPlace) this.addScore(result.secondPlace, 'silver', raceNum)

    this.state.status = 'race_end'
  }

  private addScore(playerId: string, medal: 'gold' | 'silver', raceNum: number): void {
    const player = this.state.players.find(p => p.id === playerId)
    if (!player) return
    const idx = raceNum - 1
    player.totalScore += medal === 'gold' ? GOLD_VALUES[idx] : SILVER_VALUES[idx]
    // 加铜分
    player.totalScore += this.state.bronzeScores[playerId] ?? 0
  }

  /** 开始下一场比赛 */
  startNextRace(): boolean {
    if (this.state.currentRace >= 4) {
      this.state.status = 'finished'
      return false
    }

    this.state.currentRace++
    this.state.trackSide = this.state.currentRace % 2 === 0 ? 'wild' : 'mild'
    this.state.currentPlayerIndex = 0
    this.state.raceParticipants = []
    this.state.bronzeScores = {}
    this.state.events = []
    this.state.status = 'selecting_racer'
    return true
  }

  /** 获取比赛状态对象 */
  getCurrentRaceState(): RaceState {
    return {
      id: `race-${this.state.currentRace}`,
      raceNumber: this.state.currentRace,
      status: 'racing',
      trackSide: this.state.trackSide,
      participants: this.state.raceParticipants,
      firstPlacePlayerId: null,
      secondPlacePlayerId: null,
    }
  }

  /** 获取排名 */
  getRanking(): Array<{ player: Player; gold: number; silver: number; bronze: number; total: number }> {
    return this.state.players.map(p => {
      let gold = 0, silver = 0, bronze = 0
      for (const r of this.state.raceResults) {
        if (r.firstPlace === p.id) gold += GOLD_VALUES[r.raceNumber - 1]
        if (r.secondPlace === p.id) silver += SILVER_VALUES[r.raceNumber - 1]
        bronze += r.bronzeScores[p.id] ?? 0
      }
      return { player: p, gold, silver, bronze, total: gold + silver + bronze }
    }).sort((a, b) => b.total - a.total)
  }
}

export type TurnResult = ReturnType<GameEngine['executeTurn']>
