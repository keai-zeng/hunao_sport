/**
 * 事件引擎 — 三级优先级 FIFO 事件队列
 *
 * 优先级：赛道格效果(0) → 当前玩家(1) → 其他玩家顺时针(2)
 * 同级内 FIFO。无限循环：同一技能同回合触发超限后强制结束。
 */

import type { GameEvent, GameEventType, EventPriority } from './types'
import { MAX_LOOP_ITERATIONS } from './types'

// ============================================================
// 事件队列
// ============================================================

export class EventQueue {
  private queues: [GameEvent[], GameEvent[], GameEvent[]] = [[], [], []]
  private totalProcessed = 0

  /** 添加事件到指定优先级 */
  push(event: GameEvent): void {
    this.queues[event.priority].push(event)
  }

  /** 批量添加同优先级事件 */
  pushAll(events: GameEvent[]): void {
    for (const e of events) {
      this.queues[e.priority].push(e)
    }
  }

  /** 队列是否为空 */
  isEmpty(): boolean {
    return this.queues.every(q => q.length === 0)
  }

  /** 从高优先级到低优先级取出下一个事件 */
  dequeue(): GameEvent | null {
    for (let p = 0; p <= 2; p++) {
      if (this.queues[p].length > 0) {
        this.totalProcessed++
        return this.queues[p].shift()!
      }
    }
    return null
  }

  /** 获取处理总数（用于安全阀） */
  getProcessedCount(): number {
    return this.totalProcessed
  }

  /** 清空队列 */
  clear(): void {
    this.queues = [[], [], []]
    this.totalProcessed = 0
  }
}

// ============================================================
// 循环检测器
// ============================================================

export class LoopDetector {
  private triggerCounts = new Map<string, number>()

  /** 记录一次技能触发，返回是否触发次数已达上限 */
  recordAndCheck(abilityKey: string): boolean {
    const count = (this.triggerCounts.get(abilityKey) ?? 0) + 1
    this.triggerCounts.set(abilityKey, count)
    return count >= MAX_LOOP_ITERATIONS
  }

  /** 重置（新回合开始时调用） */
  reset(): void {
    this.triggerCounts.clear()
  }

  /** 获取某技能触发次数 */
  getCount(abilityKey: string): number {
    return this.triggerCounts.get(abilityKey) ?? 0
  }
}

// ============================================================
// 事件工厂
// ============================================================

export function createEvent(
  type: GameEventType,
  priority: EventPriority,
  sourcePlayerId: string,
  targetPlayerId?: string,
  payload: Record<string, unknown> = {}
): GameEvent {
  return { type, priority, sourcePlayerId, targetPlayerId, payload }
}

// 便捷工厂方法
export const Events = {
  roll(playerId: string, value: number): GameEvent {
    return createEvent('ROLL', 1, playerId, undefined, { value })
  },

  mainMove(playerId: string, distance: number): GameEvent {
    return createEvent('MAIN_MOVE', 1, playerId, undefined, { distance })
  },

  step(playerId: string, from: number, to: number): GameEvent {
    return createEvent('STEP', 1, playerId, undefined, { from, to })
  },

  pass(sourceId: string, targetId: string, atPosition: number): GameEvent {
    return createEvent('PASS', 1, sourceId, targetId, { atPosition })
  },

  stop(playerId: string, position: number, sharedWith: string[]): GameEvent {
    return createEvent('STOP', 1, playerId, undefined, { position, sharedWith })
  },

  trackEffect(playerId: string, effect: string, position: number): GameEvent {
    return createEvent('TRACK_EFFECT', 0, playerId, undefined, { effect, position })
  },

  abilityTrigger(playerId: string, characterId: number, targetId?: string): GameEvent {
    return createEvent('ABILITY_TRIGGER', 1, playerId, targetId, { characterId })
  },

  effect(playerId: string, targetId: string, effectType: string, params: Record<string, unknown>): GameEvent {
    return createEvent('EFFECT', 1, playerId, targetId, { effectType, ...params })
  },

  trip(playerId: string): GameEvent {
    return createEvent('TRIP', 1, playerId, undefined, {})
  },

  warp(playerId: string, from: number, to: number): GameEvent {
    return createEvent('WARP', 1, playerId, undefined, { from, to })
  },

  eliminate(playerId: string, eliminatorId: string): GameEvent {
    return createEvent('ELIMINATE', 1, eliminatorId, playerId, {})
  },

  finish(playerId: string, order: 1 | 2): GameEvent {
    return createEvent('FINISH', 1, playerId, undefined, { order })
  },

  score(playerId: string, type: 'gold' | 'silver' | 'bronze', points: number): GameEvent {
    return createEvent('SCORE', 1, playerId, undefined, { scoreType: type, points })
  },
}
