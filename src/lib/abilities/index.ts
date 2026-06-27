/**
 * 角色技能实现 — 注册表 + 36 角色技能
 *
 * 每个技能导出为 AbilityHandler，在游戏初始化时注册到 GameEngine。
 */

import type { AbilityHandler } from '../gameEngine'

// ============================================================
// 技能注册表
// ============================================================

/** 所有角色技能的 Map */
export const abilityMap = new Map<number, AbilityHandler>()

/** 注册技能 */
export function registerAbility(characterId: number, handler: AbilityHandler): void {
  abilityMap.set(characterId, handler)
}

/** 批量注册到 GameEngine */
export function registerAllAbilities(engine: { registerAbility: (id: number, h: AbilityHandler) => void }): void {
  for (const [id, handler] of abilityMap) {
    engine.registerAbility(id, handler)
  }
}

// ============================================================
// 示例技能实现（逐步补全 36 个）
// ============================================================

// 1. Alchemist（炼金术士）: 掷出1或2时改为移动4格
registerAbility(1, ({ dice, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const roll = dice.currentRoll
  if (roll === 1 || roll === 2) {
    dice.currentRoll = 4
    // 修改移动距离 — 由 gameEngine 在 ROLL 阶段后读取
    pushEvent({
      type: 'EFFECT',
      priority: 1,
      sourcePlayerId: event.sourcePlayerId,
      payload: { effectType: 'MOVE_SELF', magnitude: 4, original: roll },
    })
  }
})

// 5. Centaur（半人马）: 经过他人时踢退 2 格
registerAbility(5, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const targetId = event.targetPlayerId
  if (!targetId) return
  
  // PASS 触发
  const target = race.participants.find(p => p.playerId === targetId)
  if (!target || target.isEliminated) return

  const newPos = Math.max(0, target.position - 2)
  target.position = newPos
  pushEvent({
    type: 'EFFECT',
    priority: 2,
    sourcePlayerId: event.sourcePlayerId,
    targetPlayerId: targetId,
    payload: { effectType: 'MOVE_OTHER', magnitude: -2, newPosition: newPos },
  })
})

// 7. Banana（香蕉）: 绊倒经过自己的赛车手
registerAbility(7, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const targetId = event.targetPlayerId
  if (!targetId) return

  const target = race.participants.find(p => p.playerId === targetId)
  if (!target || target.isEliminated) return

  target.isTripped = true
  pushEvent({
    type: 'TRIP',
    priority: 2,
    sourcePlayerId: event.sourcePlayerId,
    targetPlayerId: targetId,
    payload: {},
  })
})

// 15. Huge Baby（巨型宝宝）: 无人能同格（起点除外）
registerAbility(15, ({ race, event, pushEvent }) => {
  // 被动技能，在 STOP 检测后触发
  if (event.type !== 'ABILITY_TRIGGER') return
  const baby = race.participants.find(p => p.characterId === 15 && !p.isEliminated)
  if (!baby || baby.position === 0) return

  // 检查同格者
  const others = race.participants.filter(
    p => p.id !== baby.id && !p.isEliminated && p.position === baby.position
  )
  for (const other of others) {
    other.position = Math.max(0, baby.position - 1)
    pushEvent({
      type: 'EFFECT',
      priority: 0,
      sourcePlayerId: baby.playerId,
      targetPlayerId: other.playerId,
      payload: { effectType: 'BLOCK_SPACE', pushedTo: other.position },
    })
  }
})

// 20. Legs（大长腿）: 跳过掷骰，移动 5 格
registerAbility(20, ({ dice, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  dice.currentRoll = 5
  pushEvent({
    type: 'EFFECT',
    priority: 1,
    sourcePlayerId: event.sourcePlayerId,
    payload: { effectType: 'MOVE_SELF', magnitude: 5, skipRoll: true },
  })
})

// 24. M.O.U.T.H.（大嘴巴）: 停在恰好有1人的格子上时淘汰对方
registerAbility(24, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const mouth = race.participants.find(p => p.characterId === 24)
  if (!mouth || mouth.isEliminated) return

  const sameSpace = race.participants.filter(
    p => p.id !== mouth.id && !p.isEliminated && p.finishOrder === null && p.position === mouth.position
  )
  if (sameSpace.length === 1) {
    const victim = sameSpace[0]
    victim.isEliminated = true
    pushEvent({
      type: 'ELIMINATE',
      priority: 1,
      sourcePlayerId: mouth.playerId,
      targetPlayerId: victim.playerId,
      payload: {},
    })
  }
})

// 32. Scoocher（蹭蹭狗）: 别人技能触发时移动 1 格
registerAbility(32, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 不响应自己的触发或另一个 Scoocher
  if (event.payload.characterId === 32) return

  const scoocher = race.participants.find(
    p => p.characterId === 32 && !p.isEliminated && p.finishOrder === null
  )
  if (!scoocher || scoocher.playerId === event.sourcePlayerId) return

  const newPos = Math.min(scoocher.position + 1, 30)
  scoocher.position = newPos
  pushEvent({
    type: 'EFFECT',
    priority: 2,
    sourcePlayerId: scoocher.playerId,
    payload: { effectType: 'MOVE_SELF', magnitude: 1, newPosition: newPos },
  })
})

// 26. Magician（魔术师）: 可重掷最多 2 次
registerAbility(26, ({ dice, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  dice.rerollLimit = Math.max(dice.rerollLimit, 2)
})

// 14. Gunk（黏黏怪）: 其他赛车手 main move -1
registerAbility(14, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const gunk = race.participants.find(p => p.characterId === 14 && !p.isEliminated)
  if (!gunk) return

  // 减少移动距离（在 MAIN_MOVE 时由引擎应用）
  pushEvent({
    type: 'EFFECT',
    priority: 0,
    sourcePlayerId: gunk.playerId,
    targetPlayerId: event.sourcePlayerId,
    payload: { effectType: 'REDUCE_MAIN_MOVE', magnitude: -1 },
  })
})

// TODO: 其余 26 个技能按相同模式实现
