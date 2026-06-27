/**
 * 游戏引擎 — 回合管理、移动、触发检测、积分
 *
 * 事件流程：ROLL → MAIN_MOVE → [STEP → PASS/STOP] → TRACK_EFFECT → ABILITIES → 连锁
 */

import type {
  RaceParticipant, RaceState, GameEvent,
  TrackSide,
} from './types'
import { TRACK_LENGTH, GOLD_VALUES, SILVER_VALUES } from './types'
import { EventQueue, LoopDetector, Events } from './eventEngine'
import { createDiceState, roll as diceRoll, type DiceState } from './dice'
import { getTrackSpace } from './trackData'

// ============================================================
// 能力处理器类型
// ============================================================

export interface AbilityContext {
  race: RaceState
  event: GameEvent
  pushEvent: (event: GameEvent) => void
  dice: DiceState
  trackSide: TrackSide
}

export type AbilityHandler = (ctx: AbilityContext) => void

// ============================================================
// 回合结果
// ============================================================

export interface TurnResult {
  events: GameEvent[]
  raceFinished: boolean
  firstPlace?: string
  secondPlace?: string
  eliminated: string[]
}

// ============================================================
// 游戏引擎
// ============================================================

export class GameEngine {
  private abilityRegistry = new Map<number, AbilityHandler>()
  private loopDetector = new LoopDetector()

  /** 注册角色能力处理器 */
  registerAbility(characterId: number, handler: AbilityHandler): void {
    this.abilityRegistry.set(characterId, handler)
  }

  /** 获取角色的能力处理器 */
  getAbility(characterId: number): AbilityHandler | undefined {
    return this.abilityRegistry.get(characterId)
  }

  // ============================================================
  // 回合处理
  // ============================================================

  /**
   * 执行一个完整回合
   * @returns 回合结果（事件列表、比赛是否结束等）
   */
  executeTurn(
    race: RaceState,
    playerId: string,
    trackSide: TrackSide,
    onEvent?: (event: GameEvent) => void
  ): TurnResult {
    const events: GameEvent[] = []
    const eliminated: string[] = []
    const dice = createDiceState()
    const queue = new EventQueue()
    this.loopDetector.reset()

    const participant = race.participants.find(p => p.playerId === playerId)
    if (!participant || participant.isEliminated) {
      return { events, raceFinished: false, eliminated }
    }

    const pushEvent = (e: GameEvent) => {
      events.push(e)
      queue.push(e)
      onEvent?.(e)
    }

    // --- 1. 检查绊倒状态 ---
    if (participant.isTripped) {
      participant.isTripped = false
      pushEvent(Events.effect(playerId, playerId, 'RECOVER_TRIP', {}))
      return { events, raceFinished: false, eliminated }
    }

    // --- 2. 掷骰 & 主要移动 ---
    this.executeMainMove(race, participant, dice, trackSide, pushEvent)
    if (participant.isEliminated) {
      eliminated.push(playerId)
    }

    // --- 3. 处理事件队列（技能连锁） ---
    this.processQueue(queue, race, dice, trackSide, pushEvent)

    // --- 4. 比赛结束检测 ---
    const { raceFinished, firstPlace, secondPlace } = this.checkRaceEnd(race)

    return { events, raceFinished, firstPlace, secondPlace, eliminated }
  }

  // ============================================================
  // 主要移动
  // ============================================================

  private executeMainMove(
    race: RaceState,
    participant: RaceParticipant,
    dice: DiceState,
    trackSide: TrackSide,
    pushEvent: (e: GameEvent) => void
  ): number {
    const rollValue = diceRoll(dice)
    pushEvent(Events.roll(participant.playerId, rollValue))

    // 逐格移动
    let distance = rollValue

    for (let step = 0; step < distance; step++) {
      if (participant.isEliminated || participant.finishOrder !== null) break

      const fromPos = participant.position
      const toPos = Math.min(fromPos + 1, TRACK_LENGTH)

      // Stickler 检查：必须精确到达终点
      if (!this.canMoveToFinish(race, participant, fromPos, toPos)) {
        pushEvent(Events.effect(participant.playerId, participant.playerId, 'BLOCKED_FINISH', { from: fromPos }))
        break
      }

      participant.position = toPos
      pushEvent(Events.step(participant.playerId, fromPos, toPos))

      // 检测经过
      this.detectPass(race, participant, fromPos, toPos, pushEvent)

      // 检测冲线
      if (toPos >= TRACK_LENGTH) {
        const order = this.assignFinishOrder(race, participant)
        participant.finishOrder = order
        pushEvent(Events.finish(participant.playerId, order))
        break
      }
    }

    // 移动完成后：检测停止
    if (!participant.isEliminated && participant.finishOrder === null) {
      this.detectStop(race, participant, pushEvent)
      // 赛道格效果
      this.applyTrackEffects(race, participant, trackSide, pushEvent)
    }

    return rollValue
  }

  // ============================================================
  // 经过检测
  // ============================================================

  private detectPass(
    race: RaceState,
    mover: RaceParticipant,
    fromPos: number,
    toPos: number,
    pushEvent: (e: GameEvent) => void
  ): void {
    for (const other of race.participants) {
      if (other.playerId === mover.playerId || other.isEliminated || other.finishOrder !== null) continue

      // 经过：从后方移动到前方（中间经过了对方所在的格子）
      const passedFromBehind = fromPos < other.position && toPos >= other.position
      if (passedFromBehind) {
        pushEvent(Events.pass(mover.playerId, other.playerId, other.position))

        // 触发被经过者的 PASS 类技能（如 Banana, Centaur）
        this.triggerAbility(race, other, 'PASS', mover.playerId, { atPosition: other.position }, pushEvent)
        // 触发移动者的 PASS 类技能（如 Leaptoad 跳过）
        this.triggerAbility(race, mover, 'PASS', other.playerId, { atPosition: other.position }, pushEvent)
      }
    }
  }

  // ============================================================
  // 停止检测
  // ============================================================

  private detectStop(
    race: RaceState,
    mover: RaceParticipant,
    pushEvent: (e: GameEvent) => void
  ): void {
    const sharedWith = race.participants
      .filter(p =>
        p.playerId !== mover.playerId &&
        !p.isEliminated &&
        p.finishOrder === null &&
        p.position === mover.position
      )
      .map(p => p.playerId)

    pushEvent(Events.stop(mover.playerId, mover.position, sharedWith))

    // 触发停止者的技能
    this.triggerAbility(race, mover, 'STOP', undefined, { position: mover.position, sharedWith }, pushEvent)

    // 触发同格其他人的技能（如 Duelist, Baba Yaga）
    for (const otherId of sharedWith) {
      const other = race.participants.find(p => p.playerId === otherId)
      if (other) {
        this.triggerAbility(race, other, 'STOP', mover.playerId, { position: mover.position }, pushEvent)
      }
    }
  }

  // ============================================================
  // 赛道格效果
  // ============================================================

  private applyTrackEffects(
    race: RaceState,
    participant: RaceParticipant,
    trackSide: TrackSide,
    pushEvent: (e: GameEvent) => void
  ): void {
    const space = getTrackSpace(trackSide, participant.position)
    if (!space) return

    if (space.hasStar) {
      pushEvent(Events.trackEffect(participant.playerId, 'STAR', participant.position))
      pushEvent(Events.score(participant.playerId, 'bronze', 1))
    }

    if (space.hasTrip) {
      participant.isTripped = true
      pushEvent(Events.trackEffect(participant.playerId, 'TRIP', participant.position))
      pushEvent(Events.trip(participant.playerId))
    }

    if (space.hasArrow) {
      const dir = space.arrowDirection === 'forward' ? 1 : -1
      const dist = space.arrowDistance ?? 0
      const newPos = Math.max(0, Math.min(TRACK_LENGTH, participant.position + dir * dist))
      pushEvent(Events.trackEffect(participant.playerId, 'ARROW', participant.position))
      participant.position = newPos

      // 箭头移动后也检测停止 + 递归检查新格子
      this.detectStop(race, participant, pushEvent)
      this.applyTrackEffects(race, participant, trackSide, pushEvent)

      // 检测冲线
      if (newPos >= TRACK_LENGTH && participant.finishOrder === null) {
        const order = this.assignFinishOrder(race, participant)
        participant.finishOrder = order
        pushEvent(Events.finish(participant.playerId, order))
      }
    }
  }

  // ============================================================
  // 事件队列处理
  // ============================================================

  private processQueue(
    queue: EventQueue,
    race: RaceState,
    dice: DiceState,
    trackSide: TrackSide,
    pushEvent: (e: GameEvent) => void
  ): void {
    while (!queue.isEmpty()) {
      const event = queue.dequeue()
      if (!event) break

      switch (event.type) {
        case 'ABILITY_TRIGGER': {
          const charId = event.payload.characterId as number
          const handler = this.abilityRegistry.get(charId)
          if (handler) {
            const key = `char_${charId}_${event.sourcePlayerId}`
            if (!this.loopDetector.recordAndCheck(key)) {
              handler({
                race,
                event,
                pushEvent,
                dice,
                trackSide,
              })
            }
          }
          break
        }
        // 其他事件类型由监听者（UI/日志）处理
        default:
          break
      }
    }
  }

  // ============================================================
  // 技能触发
  // ============================================================

  private triggerAbility(
    _race: RaceState,
    participant: RaceParticipant,
    _triggerType: string,
    targetId: string | undefined,
    _params: Record<string, unknown>,
    pushEvent: (e: GameEvent) => void
  ): void {
    if (participant.isEliminated || participant.finishOrder !== null) return

    pushEvent(Events.abilityTrigger(
      participant.playerId,
      participant.characterId,
      targetId,
    ))
  }

  // ============================================================
  // 冲线 & 比赛结束
  // ============================================================

  private assignFinishOrder(race: RaceState, participant: RaceParticipant): 1 | 2 {
    if (!race.firstPlacePlayerId) {
      race.firstPlacePlayerId = participant.playerId
      race.status = 'racing' // 第1名冲线后继续比赛
      return 1
    } else if (!race.secondPlacePlayerId) {
      race.secondPlacePlayerId = participant.playerId
      race.status = 'finished'
      return 2
    }
    return 2
  }

  private checkRaceEnd(race: RaceState): {
    raceFinished: boolean
    firstPlace?: string
    secondPlace?: string
  } {
    // 第2名冲线 → 比赛结束
    if (race.secondPlacePlayerId) {
      return {
        raceFinished: true,
        firstPlace: race.firstPlacePlayerId!,
        secondPlace: race.secondPlacePlayerId,
      }
    }

    // 只剩1人存活 → 比赛结束
    const alive = race.participants.filter(p => !p.isEliminated && p.finishOrder === null)
    if (alive.length === 1 && race.firstPlacePlayerId) {
      race.secondPlacePlayerId = alive[0].playerId
      alive[0].finishOrder = 2
      race.status = 'finished'
      return {
        raceFinished: true,
        firstPlace: race.firstPlacePlayerId,
        secondPlace: alive[0].playerId,
      }
    }

    return { raceFinished: false }
  }

  // ============================================================
  // Stickler 检查
  // ============================================================

  private canMoveToFinish(
    race: RaceState,
    _participant: RaceParticipant,
    fromPos: number,
    toPos: number
  ): boolean {
    if (toPos < TRACK_LENGTH) return true
    if (fromPos + 1 > TRACK_LENGTH) return true // 已经在终点

    // 检查场上是否有 Stickler（character 33）
    const stickler = race.participants.find(
      p => p.characterId === 33 && !p.isEliminated && p.finishOrder === null
    )
    if (!stickler) return true

    // Stickler 规则：必须精确到达终点，不能超过
    // 这里假设距离=1的逐格移动，所以到达 TRACK_LENGTH 就是精确
    return toPos === TRACK_LENGTH
  }

  // ============================================================
  // 积分计算
  // ============================================================

  /** 计算某场比赛的金银牌得分 */
  static getMedalPoints(raceNumber: number, medal: 'gold' | 'silver'): number {
    const idx = raceNumber - 1
    return medal === 'gold' ? GOLD_VALUES[idx] : SILVER_VALUES[idx]
  }
}
