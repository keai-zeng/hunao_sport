/**
 * 轮抽引擎 — 蛇形选秀逻辑
 *
 * 流程：
 * 1. 掷骰决定起始选秀者
 * 2. 翻 2×人数 张角色卡
 * 3. 蛇形选秀：顺时针 1→N，再逆时针 N→1，每人选 2 张
 * 4. 从起始者左边开始第二轮，重复
 * 5. 最终每人 4 张（标准模式）
 */

import type { Character, GameVariant, Player } from './types'

// ============================================================
// 轮抽状态
// ============================================================

export interface DraftState {
  batch: number                // 当前批次 1-2
  direction: 'forward' | 'backward'
  currentPickerSeat: number    // 当前选秀者的座位号
  revealedCards: Character[]   // 当前批次展示的角色
  pickedCards: Map<string, Character[]>  // playerId → 已选角色
  draftOrder: string[]         // 当前批次的选秀顺序（playerId 列表）
  draftIndex: number           // 当前选到第几个人
  isComplete: boolean
}

// ============================================================
// 配置
// ============================================================

/** 根据变体和人数获取每人角色总数 */
export function getRacersPerPlayer(variant: GameVariant, _playerCount: number): number {
  if (variant === 'standard') return 4
  return 8  // 2人/3人变体每人8个
}

/** 每批次翻牌数量 = 2 × 人数 */
export function getCardsPerBatch(playerCount: number): number {
  return playerCount * 2
}

/** 总批次数 */
export function getBatchCount(variant: GameVariant): number {
  if (variant === 'standard') return 2
  return 4  // 变体每人需要8张=4批
}

// ============================================================
// 蛇形顺序生成
// ============================================================

/**
 * 生成蛇形选秀顺序
 * 例：6人 → [0,1,2,3,4,5,5,4,3,2,1,0]
 */
export function generateSnakeOrder(playerCount: number, picksPerPlayerPerBatch: number): number[] {
  const order: number[] = []
  const seats = Array.from({ length: playerCount }, (_, i) => i)

  for (let pick = 0; pick < picksPerPlayerPerBatch; pick++) {
    if (pick % 2 === 0) {
      order.push(...seats)                    // 正向
    } else {
      order.push(...[...seats].reverse())     // 反向
    }
  }

  return order
}

// ============================================================
// 轮抽引擎
// ============================================================

export class DraftEngine {
  private allCharacters: Character[]
  private usedIndices = new Set<number>()

  constructor(characters: Character[]) {
    this.allCharacters = [...characters]
  }

  /** 初始化轮抽状态 */
  initDraft(
    players: Player[],
    startPlayerId: string,
    _variant: GameVariant
  ): DraftState {
    const playerCount = players.length
    const sortedPlayers = [...players].sort((a, b) => a.seatOrder - b.seatOrder)
    const startSeat = sortedPlayers.findIndex(p => p.id === startPlayerId)

    const snakeOrder = generateSnakeOrder(playerCount, 2) // 每批每人选2张
    const draftOrder = snakeOrder.map(i => sortedPlayers[i].id)

    return {
      batch: 1,
      direction: 'forward',
      currentPickerSeat: startSeat,
      revealedCards: this.drawCards(getCardsPerBatch(playerCount)),
      pickedCards: new Map(sortedPlayers.map(p => [p.id, []])),
      draftOrder,
      draftIndex: 0,
      isComplete: false,
    }
  }

  /** 获取当前应选秀的玩家 ID */
  getCurrentPicker(draft: DraftState): string {
    return draft.draftOrder[draft.draftIndex]
  }

  /** 玩家选择一张牌 */
  pickCard(draft: DraftState, playerId: string, characterId: number): boolean {
    const picker = this.getCurrentPicker(draft)
    if (picker !== playerId) return false

    const card = draft.revealedCards.find(c => c.id === characterId)
    if (!card) return false

    // 记录选择
    const picked = draft.pickedCards.get(playerId) ?? []
    picked.push(card)
    draft.pickedCards.set(playerId, picked)

    // 从展示中移除
    draft.revealedCards = draft.revealedCards.filter(c => c.id !== characterId)
    draft.draftIndex++

    // 检查批次是否结束
    if (draft.draftIndex >= draft.draftOrder.length) {
      draft.batch++
      if (draft.batch > getBatchCount('standard')) { // TODO: variant
        draft.isComplete = true
      } else {
        // 下一批：从起始者左边开始
        draft.draftIndex = 0
        draft.revealedCards = this.drawCards(
          getCardsPerBatch(draft.draftOrder.length / 2)  // 每个位置出现2次
        )
      }
    }

    return true
  }

  /** 获取所有玩家的已选角色 */
  getPicks(draft: DraftState): Map<string, Character[]> {
    return draft.pickedCards
  }

  // ============================================================
  // 辅助
  // ============================================================

  private drawCards(count: number): Character[] {
    const available = this.allCharacters
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !this.usedIndices.has(i))

    // 随机抽取
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    const drawn = shuffled.slice(0, count)

    for (const { i } of drawn) {
      this.usedIndices.add(i)
    }

    return drawn.map(({ c }) => c)
  }
}
