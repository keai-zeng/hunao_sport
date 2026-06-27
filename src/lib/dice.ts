/**
 * 骰子系统 — D6 掷骰 + 重掷支持
 */

export interface DiceState {
  currentRoll: number | null
  rerollsUsed: number
  rerollLimit: number       // 本回合剩余重掷次数
  history: number[]          // 当前回合掷骰历史（重掷前的结果不保存）
}

/** 创建初始骰子状态 */
export function createDiceState(rerollLimit = 0): DiceState {
  return {
    currentRoll: null,
    rerollsUsed: 0,
    rerollLimit,
    history: [],
  }
}

/** 掷 D6，返回 1-6 */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1
}

/** 执行掷骰，更新状态 */
export function roll(dice: DiceState): number {
  const result = rollD6()
  dice.currentRoll = result
  dice.history = [result]
  return result
}

/** 重掷（如果还有次数） */
export function reroll(dice: DiceState): number | null {
  if (dice.rerollsUsed >= dice.rerollLimit) return null

  const result = rollD6()
  dice.currentRoll = result
  dice.rerollsUsed++
  dice.history.push(result)
  return result
}

/** 是否可以重掷 */
export function canReroll(dice: DiceState): boolean {
  return dice.rerollsUsed < dice.rerollLimit
}

/** 获取当前掷骰结果 */
export function getCurrentRoll(dice: DiceState): number | null {
  return dice.currentRoll
}

/** 重置骰子状态（新回合） */
export function resetDice(dice: DiceState): void {
  dice.currentRoll = null
  dice.rerollsUsed = 0
  dice.history = []
}

/** 增加重掷上限 */
export function addRerollLimit(dice: DiceState, amount: number): void {
  dice.rerollLimit += amount
}
