/**
 * 角色技能实现 — 完整 36 角色技能注册表
 *
 * 每个技能是 AbilityHandler，在游戏初始化时注册到 GameEngine。
 * 触发上下文通过 AbilityContext 传入。
 */

import type { AbilityHandler } from '../gameEngine'

// ============================================================
// 技能注册表
// ============================================================

export const abilityMap = new Map<number, AbilityHandler>()

export function registerAbility(characterId: number, handler: AbilityHandler): void {
  abilityMap.set(characterId, handler)
}

export function registerAllAbilities(engine: { registerAbility: (id: number, h: AbilityHandler) => void }): void {
  for (const [id, handler] of abilityMap) {
    engine.registerAbility(id, handler)
  }
}

// ============================================================
// 辅助函数
// ============================================================

function findMe(ctx: Parameters<AbilityHandler>[0]) {
  return ctx.race.participants.find(p => p.playerId === ctx.event.sourcePlayerId)
}

function findTarget(ctx: Parameters<AbilityHandler>[0]) {
  if (!ctx.event.targetPlayerId) return undefined
  return ctx.race.participants.find(p => p.playerId === ctx.event.targetPlayerId)
}

// ============================================================
// 01. Alchemist（炼金术士）: 掷出1或2时改为移动4格
// ============================================================
registerAbility(1, ({ dice }) => {
  const roll = dice.currentRoll
  if (roll === 1 || roll === 2) {
    dice.currentRoll = 4
  }
})

// ============================================================
// 02. Blimp（飞艇）: 第二个弯道前 main move +3，之后 -1
// ============================================================
// 注：第二个弯道位置由 trackData 定义（Mild: 无弯道概念，Wild: pos 15）
registerAbility(2, ({ race, event }) => {
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || event.type !== 'ABILITY_TRIGGER') return

  // 简化：position < 15 视为弯道前
  const beforeCorner = me.position < 15
  // 由引擎在计算 main move 时读取此标记
  event.payload = { ...event.payload, blimpModifier: beforeCorner ? 3 : -1 }
})

// ============================================================
// 03. Coach（教练）: 同格所有人 main move +1（含自己）
// ============================================================
registerAbility(3, ({ race, pushEvent, event }) => {
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return

  const sameSpace = race.participants.filter(
    p => !p.isEliminated && p.finishOrder === null && p.position === me.position
  )
  for (const p of sameSpace) {
    pushEvent({
      type: 'EFFECT', priority: 0,
      sourcePlayerId: me.playerId, targetPlayerId: p.playerId,
      payload: { effectType: 'BOOST_MAIN_MOVE', magnitude: 1 },
    })
  }
})

// ============================================================
// 04. Baba Yaga（芭芭雅嘎）: 停在我格子上或被停时，绊倒对方
// ============================================================
registerAbility(4, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  const target = findTarget({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || !target || target.isEliminated) return

  target.isTripped = true
  pushEvent({
    type: 'TRIP', priority: 2,
    sourcePlayerId: me.playerId, targetPlayerId: target.playerId,
    payload: { trippedBy: 'BabaYaga' },
  })
})

// ============================================================
// 05. Centaur（半人马）: 经过他人时踢退 2 格（不低于起点）
// ============================================================
registerAbility(5, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const target = findTarget({ race, event } as Parameters<AbilityHandler>[0])
  if (!target || target.isEliminated) return

  const newPos = Math.max(0, target.position - 2)
  target.position = newPos
  pushEvent({
    type: 'EFFECT', priority: 2,
    sourcePlayerId: event.sourcePlayerId, targetPlayerId: target.playerId,
    payload: { effectType: 'MOVE_OTHER', magnitude: -2, newPosition: newPos },
  })
})

// ============================================================
// 06. Copy Cat（模仿猫）: 持续拥有领先者的能力
// ============================================================
registerAbility(6, ({ race, event }) => {
  // 被动技能，由引擎在需要时从领先者复制能力
  // 标记 payload 表示需要复制
  if (event.type !== 'ABILITY_TRIGGER') return

  const alive = race.participants.filter(p => !p.isEliminated && p.finishOrder === null)
  if (alive.length === 0) return
  const lead = alive.reduce((a, b) => a.position > b.position ? a : b)
  if (lead.characterId === 6) return  // 不复制自己

  // 标记为从 lead 复制能力
  event.payload = { ...event.payload, copyFrom: lead.characterId }
})

// ============================================================
// 07. Banana（香蕉）: 绊倒经过我的赛车手
// ============================================================
registerAbility(7, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const target = findTarget({ race, event } as Parameters<AbilityHandler>[0])
  if (!target || target.isEliminated) return

  target.isTripped = true
  pushEvent({
    type: 'TRIP', priority: 2,
    sourcePlayerId: event.sourcePlayerId, targetPlayerId: target.playerId,
    payload: { trippedBy: 'Banana' },
  })
})

// ============================================================
// 08. Cheerleader（啦啦队长）: 主要移动前，让最后一名移动2格，自己移动1格
// ============================================================
registerAbility(8, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return

  // 找最后一名（可能包括自己）
  const alive = race.participants.filter(p => !p.isEliminated && p.finishOrder === null)
  const minPos = Math.min(...alive.map(p => p.position))
  const lastPlacers = alive.filter(p => p.position === minPos)

  for (const lp of lastPlacers) {
    lp.position = Math.min(lp.position + 2, 30)
    pushEvent({
      type: 'EFFECT', priority: 1,
      sourcePlayerId: me.playerId, targetPlayerId: lp.playerId,
      payload: { effectType: 'MOVE_OTHER', magnitude: 2, newPosition: lp.position },
    })
  }

  // 自己移动 1 格
  me.position = Math.min(me.position + 1, 30)
  pushEvent({
    type: 'EFFECT', priority: 1,
    sourcePlayerId: me.playerId,
    payload: { effectType: 'MOVE_SELF', magnitude: 1, newPosition: me.position },
  })
})

// ============================================================
// 09. Dicemonger（骰子贩子）: 任何人每回合可重掷1次；别人重掷时我移动1格
// ============================================================
registerAbility(9, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 如果是别人触发了重掷，我移动
  if (event.payload.rerollBy && event.payload.rerollBy !== me.playerId) {
    me.position = Math.min(me.position + 1, 30)
    pushEvent({
      type: 'EFFECT', priority: 2,
      sourcePlayerId: me.playerId,
      payload: { effectType: 'MOVE_SELF', magnitude: 1, newPosition: me.position },
    })
  }
})

// ============================================================
// 10. Duelist（决斗者）: 同格时发起决斗，双方掷骰，胜者前进2格，平局我赢
// ============================================================
registerAbility(10, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  const sameSpace = race.participants.filter(
    p => p.id !== me.id && !p.isEliminated && p.finishOrder === null && p.position === me.position
  )
  if (sameSpace.length === 0) return

  // 对每个同格者发起决斗
  for (const opponent of sameSpace) {
    const myRoll = Math.floor(Math.random() * 6) + 1
    const theirRoll = Math.floor(Math.random() * 6) + 1
    const winner = myRoll >= theirRoll ? me : opponent
    winner.position = Math.min(winner.position + 2, 30)
    pushEvent({
      type: 'EFFECT', priority: 1,
      sourcePlayerId: me.playerId, targetPlayerId: opponent.playerId,
      payload: {
        effectType: 'DUEL', myRoll, theirRoll,
        winnerId: winner.playerId, newPosition: winner.position,
      },
    })
  }
})

// ============================================================
// 11. Genius（天才）: 预测掷骰点数，猜对再获得一回合
// ============================================================
registerAbility(11, ({ event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 由 UI 层处理预测输入，引擎标记 extraTurn
  event.payload = { ...event.payload, canPredict: true }
})

// ============================================================
// 12. Heckler（起哄者）: 赛车手结束回合时位移≤1格，我移动2格
// ============================================================
registerAbility(12, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated || event.sourcePlayerId === me.playerId) return

  // 由引擎在回合结束时检查位移，触发此技能
  const movedBy = (event.payload.movedBy as number) ?? 999
  if (movedBy <= 1) {
    me.position = Math.min(me.position + 2, 30)
    pushEvent({
      type: 'EFFECT', priority: 2,
      sourcePlayerId: me.playerId,
      payload: { effectType: 'MOVE_SELF', magnitude: 2, newPosition: me.position },
    })
  }
})

// ============================================================
// 13. Egg（蛋）: 赛前抽3选1，获得其能力（BEFORE_RACE）
// ============================================================
registerAbility(13, ({ event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 赛前由 UI 抽3张展示，选1张，标记为复制的角色
  event.payload = { ...event.payload, drawCount: 3, pickCount: 1 }
})

// ============================================================
// 14. Gunk（黏黏怪）: 其他赛车手 main move -1
// ============================================================
registerAbility(14, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 对所有其他活跃角色施加 -1
  for (const p of race.participants) {
    if (p.playerId !== me.playerId && !p.isEliminated && p.finishOrder === null) {
      pushEvent({
        type: 'EFFECT', priority: 0,
        sourcePlayerId: me.playerId, targetPlayerId: p.playerId,
        payload: { effectType: 'REDUCE_MAIN_MOVE', magnitude: -1 },
      })
    }
  }
})

// ============================================================
// 15. Huge Baby（巨型宝宝）: 无人能同格（起点除外），被迫同格者放身后
// ============================================================
registerAbility(15, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated || me.position === 0) return

  const others = race.participants.filter(
    p => p.id !== me.id && !p.isEliminated && p.position === me.position
  )
  for (const other of others) {
    other.position = Math.max(0, me.position - 1)
    pushEvent({
      type: 'EFFECT', priority: 0,
      sourcePlayerId: me.playerId, targetPlayerId: other.playerId,
      payload: { effectType: 'BLOCK_SPACE', pushedTo: other.position },
    })
  }
})

// ============================================================
// 16. Flip Flop（翻转蛙）: 跳过掷骰，与另一名赛车手交换位置（传送）
// ============================================================
registerAbility(16, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  const targetId = event.payload.swapTarget as string | undefined
  if (!targetId) return  // UI 选择目标

  const target = race.participants.find(p => p.playerId === targetId)
  if (!target || target.isEliminated) return

  const myPos = me.position
  me.position = target.position
  target.position = myPos

  pushEvent({
    type: 'WARP', priority: 1,
    sourcePlayerId: me.playerId, targetPlayerId: targetId,
    payload: { effectType: 'SWAP', from: myPos, to: me.position },
  })
})

// ============================================================
// 17. Hare（兔子）: main move +2；若回合开始时独自领先则跳过
// ============================================================
registerAbility(17, ({ race, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return

  // 检查是否独自领先
  const alive = race.participants.filter(p => !p.isEliminated && p.finishOrder === null)
  const maxPos = Math.max(...alive.map(p => p.position))
  const leaders = alive.filter(p => p.position === maxPos)

  if (leaders.length === 1 && leaders[0].playerId === me.playerId) {
    // 独自领先 → 跳过 main move
    event.payload = { ...event.payload, skipMainMove: true }
  } else {
    // +2 加成
    event.payload = { ...event.payload, hareBoost: 2 }
  }
})

// ============================================================
// 18. Hypnotist（催眠师）: main move 前传送一名赛车手到我所在格
// ============================================================
registerAbility(18, ({ race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  const targetId = event.payload.hypnotizeTarget as string | undefined
  if (!targetId) return  // UI 选择目标

  const target = race.participants.find(p => p.playerId === targetId)
  if (!target || target.isEliminated) return

  const from = target.position
  target.position = me.position
  pushEvent({
    type: 'WARP', priority: 1,
    sourcePlayerId: me.playerId, targetPlayerId: targetId,
    payload: { effectType: 'WARP', from, to: me.position },
  })
})

// ============================================================
// 19. Inchworm（尺蠖）: 别人掷出1时跳过移动，我移动1格
// ============================================================
registerAbility(19, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return
  if (event.sourcePlayerId === me.playerId) return

  const roll = event.payload.rollValue as number | undefined
  if (roll === 1) {
    // 跳过对方移动（通过标记）
    event.payload = { ...event.payload, skipMove: true }
    // 自己移动 1 格
    me.position = Math.min(me.position + 1, 30)
    pushEvent({
      type: 'EFFECT', priority: 2,
      sourcePlayerId: me.playerId,
      payload: { effectType: 'MOVE_SELF', magnitude: 1, newPosition: me.position },
    })
  }
})

// ============================================================
// 20. Legs（大长腿）: 跳过掷骰，移动5格（算 main move）
// ============================================================
registerAbility(20, ({ dice }) => {
  dice.currentRoll = 5
})

// ============================================================
// 21. Mastermind（策划者）: 第一次回合预测冠军，猜对比赛结束我获第2
// ============================================================
registerAbility(21, ({ event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 首次回合由 UI 选择预测目标
  event.payload = { ...event.payload, canPredictWinner: true, firstTurnOnly: true }
})

// ============================================================
// 22. Lackey（马屁精）: 别人掷出6时，在他们移动前我先移动2格
// ============================================================
registerAbility(22, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return
  if (event.sourcePlayerId === me.playerId) return

  const roll = event.payload.rollValue as number | undefined
  if (roll === 6) {
    me.position = Math.min(me.position + 2, 30)
    pushEvent({
      type: 'EFFECT', priority: 1,  // 在其他玩家移动之前
      sourcePlayerId: me.playerId,
      payload: { effectType: 'MOVE_SELF', magnitude: 2, newPosition: me.position },
    })
  }
})

// ============================================================
// 23. Loveable Loser（可爱输家）: 独自在最后一名时得1分
// ============================================================
registerAbility(23, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  const alive = race.participants.filter(p => !p.isEliminated && p.finishOrder === null)
  const minPos = Math.min(...alive.map(p => p.position))
  const lastPlacers = alive.filter(p => p.position === minPos)

  if (lastPlacers.length === 1 && lastPlacers[0].playerId === me.playerId) {
    pushEvent({
      type: 'SCORE', priority: 1,
      sourcePlayerId: me.playerId,
      payload: { scoreType: 'bronze', points: 1 },
    })
  }
})

// ============================================================
// 24. M.O.U.T.H.（大嘴巴）: 停在恰好有1人的格子上时淘汰对方
// ============================================================
registerAbility(24, ({ race, pushEvent }) => {
  const mouth = race.participants.find(p => p.characterId === 24 && !p.isEliminated)
  if (!mouth) return

  const sameSpace = race.participants.filter(
    p => p.id !== mouth.id && !p.isEliminated && p.finishOrder === null && p.position === mouth.position
  )
  if (sameSpace.length === 1) {
    const victim = sameSpace[0]
    victim.isEliminated = true
    pushEvent({
      type: 'ELIMINATE', priority: 1,
      sourcePlayerId: mouth.playerId, targetPlayerId: victim.playerId,
      payload: { eliminator: 'MOUTH' },
    })
  }
})

// ============================================================
// 25. Leaptoad（跳蛙）: 移动时跳过有人的格子（含后退）
// ============================================================
registerAbility(25, ({ race, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return
  // 标记跳过占用格，由引擎在逐格移动时读取
  event.payload = { ...event.payload, skipOccupied: true }
})

// ============================================================
// 26. Magician（魔术师）: 可重掷 main move 最多2次
// ============================================================
registerAbility(26, ({ dice }) => {
  dice.rerollLimit = Math.max(dice.rerollLimit, 2)
})

// ============================================================
// 27. Party Animal（派对动物）: main move 前所有人向我移动1格；同格每人给+1
// ============================================================
registerAbility(27, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 所有其他活跃赛车手向我移动 1 格
  for (const p of race.participants) {
    if (p.playerId === me.playerId || p.isEliminated || p.finishOrder !== null) continue
    const dir = p.position < me.position ? 1 : (p.position > me.position ? -1 : 0)
    if (dir !== 0) {
      p.position += dir
      pushEvent({
        type: 'EFFECT', priority: 1,
        sourcePlayerId: me.playerId, targetPlayerId: p.playerId,
        payload: { effectType: 'MOVE_OTHER', magnitude: dir, newPosition: p.position },
      })
    }
  }

  // 同格人数作为 main move 加成
  const sameSpace = race.participants.filter(
    p => p.id !== me.id && !p.isEliminated && p.finishOrder === null && p.position === me.position
  )
  event.payload = { ...event.payload, partyBoost: sameSpace.length }
})

// ============================================================
// 28. Rocket Scientist（火箭科学家）: 掷骰后可翻倍，翻倍则绊倒自己
// ============================================================
registerAbility(28, ({ dice, race, event, pushEvent }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return

  // 由 UI 决定是否翻倍；此处标记能力可用
  event.payload = { ...event.payload, canDouble: true, characterId: 28 }
  // 如果选择翻倍
  if (event.payload.doDouble) {
    dice.currentRoll = (dice.currentRoll ?? 0) * 2
    me.isTripped = true
    pushEvent({
      type: 'TRIP', priority: 1,
      sourcePlayerId: me.playerId,
      payload: { trippedBy: 'RocketScientist' },
    })
  }
})

// ============================================================
// 29. Sisyphus（西西弗斯）: 赛前获4分；掷出6时传送到起点并扣1分
// ============================================================
registerAbility(29, ({ race, pushEvent, event, dice }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me) return

  // 赛前技能：在比赛开始阶段处理
  if (event.payload.phase === 'BEFORE_RACE') {
    pushEvent({
      type: 'SCORE', priority: 1,
      sourcePlayerId: me.playerId,
      payload: { scoreType: 'bronze', points: 4, reason: 'Sisyphus' },
    })
    return
  }

  // 掷出 6 → 传送到起点 + 扣分
  const roll = dice.currentRoll
  if (roll === 6) {
    me.position = 0
    pushEvent({
      type: 'WARP', priority: 1,
      sourcePlayerId: me.playerId,
      payload: { effectType: 'WARP', to: 0, skipMainMove: true },
    })
    pushEvent({
      type: 'SCORE', priority: 1,
      sourcePlayerId: me.playerId,
      payload: { scoreType: 'bronze', points: -1, reason: 'SisyphusRoll6' },
    })
  }
})

// ============================================================
// 30. Romantic（浪漫主义者）: 任何人停在恰好2人同格时，我移动2格
// ============================================================
registerAbility(30, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 检查是否有格子恰好 2 人
  const posCounts = new Map<number, string[]>()
  for (const p of race.participants) {
    if (p.isEliminated || p.finishOrder !== null) continue
    const ids = posCounts.get(p.position) ?? []
    ids.push(p.playerId)
    posCounts.set(p.position, ids)
  }

  for (const [, ids] of posCounts) {
    if (ids.length === 2) {
      me.position = Math.min(me.position + 2, 30)
      pushEvent({
        type: 'EFFECT', priority: 2,
        sourcePlayerId: me.playerId,
        payload: { effectType: 'MOVE_SELF', magnitude: 2, newPosition: me.position },
      })
      break  // 一次触发只移动一次
    }
  }
})

// ============================================================
// 31. Skipper（船长）: 任何人掷出1时，我插队到下一位行动
// ============================================================
registerAbility(31, ({ race, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return
  if (event.sourcePlayerId === me.playerId) return

  const roll = event.payload.rollValue as number | undefined
  if (roll === 1) {
    // 标记插队
    event.payload = { ...event.payload, skipperInterrupt: me.playerId }
  }
})

// ============================================================
// 32. Scoocher（蹭蹭狗）: 别人技能触发时我移动1格
// ============================================================
registerAbility(32, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 不响应自己的触发
  if (event.payload.characterId === 32) return

  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated || me.finishOrder !== null) return
  if (me.playerId === event.sourcePlayerId) return

  me.position = Math.min(me.position + 1, 30)
  pushEvent({
    type: 'EFFECT', priority: 2,
    sourcePlayerId: me.playerId,
    payload: { effectType: 'MOVE_SELF', magnitude: 1, newPosition: me.position },
  })
})

// ============================================================
// 33. Stickler（较真鬼）: 其他赛车手必须精确到达终点才能冲线
// ============================================================
registerAbility(33, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 引擎已在 canMoveToFinish 中检查 Stickler
  pushEvent({
    type: 'EFFECT', priority: 0,
    sourcePlayerId: me.playerId,
    payload: { effectType: 'BLOCK_SPACE', exactFinishRequired: true },
  })
})

// ============================================================
// 34. Suckerfish（吸盘鱼）: 同格赛车手移动时，我跟到新位置
// ============================================================
registerAbility(34, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  const targetId = event.payload.followTarget as string | undefined
  if (!targetId) return

  const target = race.participants.find(p => p.playerId === targetId && p.position !== me.position)
  if (!target) return

  const from = me.position
  me.position = target.position
  pushEvent({
    type: 'EFFECT', priority: 2,
    sourcePlayerId: me.playerId, targetPlayerId: targetId,
    payload: { effectType: 'MOVE_SELF', magnitude: me.position - from, newPosition: me.position },
  })
})

// ============================================================
// 35. Third Wheel（电灯泡）: main move 前传送到恰好2人的格子
// ============================================================
registerAbility(35, ({ race, pushEvent, event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  const me = findMe({ race, event } as Parameters<AbilityHandler>[0])
  if (!me || me.isEliminated) return

  // 找恰好 2 人的格子
  const posCounts = new Map<number, string[]>()
  for (const p of race.participants) {
    if (p.isEliminated || p.finishOrder !== null || p.playerId === me.playerId) continue
    const ids = posCounts.get(p.position) ?? []
    ids.push(p.playerId)
    posCounts.set(p.position, ids)
  }

  for (const [pos, ids] of posCounts) {
    if (ids.length === 2) {
      const from = me.position
      me.position = pos
      pushEvent({
        type: 'WARP', priority: 1,
        sourcePlayerId: me.playerId,
        payload: { effectType: 'WARP', from, to: pos },
      })
      break
    }
  }
})

// ============================================================
// 36. Twin（双胞胎）: 赛前选一个前一场获胜者，用其能力比赛
// ============================================================
registerAbility(36, ({ event }) => {
  if (event.type !== 'ABILITY_TRIGGER') return
  // 赛前由 UI 选择前一场冠军，标记复制的角色
  event.payload = { ...event.payload, canCopyPreviousWinner: true }
})
