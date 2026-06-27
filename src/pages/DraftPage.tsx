import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/StoreContext'
import { ALL_CHARACTERS } from '../lib/localGameStore'

export default function DraftPage() {
  const navigate = useNavigate()
  const store = useStore()
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)

  const players = store.state.players
  const picksPerPlayer = 4
  const batchSize = players.length * 2

  // 当前批次展示的角色（随机选 batchSize 个未选的）
  const [batch1] = useState(() =>
    [...ALL_CHARACTERS].sort(() => Math.random() - 0.5).slice(0, batchSize)
  )
  const [batch2] = useState(() =>
    [...ALL_CHARACTERS].sort(() => Math.random() - 0.5).slice(batchSize, batchSize * 2)
  )
  const [currentBatch, setCurrentBatch] = useState(1)
  const [revealed, setRevealed] = useState(batch1)
  const [pickCounts, setPickCounts] = useState<number[]>(players.map(() => 0))
  const [draftDone, setDraftDone] = useState(false)

  // 蛇形顺序
  const snakeOrder = useMemo(() => {
    const order: number[] = []
    for (let pick = 0; pick < 2; pick++) {
      if (pick % 2 === 0) {
        for (let i = 0; i < players.length; i++) order.push(i)
      } else {
        for (let i = players.length - 1; i >= 0; i--) order.push(i)
      }
    }
    return order
  }, [players.length])

  const currentPicker = snakeOrder[currentPlayerIdx % snakeOrder.length]

  function pickCard(charId: number) {
    const player = players[currentPicker]
    store.draftPick(player.id, charId)

    const newCounts = [...pickCounts]
    newCounts[currentPicker]++
    setPickCounts(newCounts)

    // 移除已选卡片
    setRevealed(prev => prev.filter(c => c.id !== charId))

    // 下一人选秀
    let nextIdx = currentPlayerIdx + 1
    if (nextIdx >= snakeOrder.length) {
      // 当前批次结束
      if (currentBatch === 1) {
        setCurrentBatch(2)
        setRevealed(batch2)
        nextIdx = 0
      } else {
        // 轮抽完成
        setDraftDone(true)
        return
      }
    }
    setCurrentPlayerIdx(nextIdx)
  }

  if (draftDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">轮抽完成！</h1>
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mb-6">
          <h2 className="text-lg font-semibold mb-4">各队伍阵容</h2>
          {players.map(p => {
            const picks = store.state.draftPicks.get(p.id) ?? []
            return (
              <div key={p.id} className="mb-3 p-3 bg-gray-700 rounded-lg">
                <div className="font-semibold mb-1">{p.nickname}</div>
                <div className="flex flex-wrap gap-1">
                  {picks.map(c => (
                    <span key={c.id} className="text-xs bg-purple-900/50 px-2 py-1 rounded">
                      {c.nameZh}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => {
            store.state.status = 'selecting_racer'
            navigate('/game/local')
          }}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition-colors"
        >
          🏁 开始比赛
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">📋 轮抽选角</h1>
            <p className="text-gray-400 mt-1">
              第 {currentBatch}/2 轮 · 蛇形选秀
            </p>
          </div>
        </div>

        {/* 当前选秀者 */}
        <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-4 mb-6">
          <div className="text-sm text-purple-300 mb-1">当前选秀者</div>
          <span className="text-xl font-bold">{players[currentPicker]?.nickname}</span>
          <span className="text-gray-400 ml-2">
            （已选 {pickCounts[currentPicker]}/{picksPerPlayer}）
          </span>
        </div>

        {/* 角色卡片网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {revealed.map(char => (
            <button
              key={char.id}
              onClick={() => pickCard(char.id)}
              className="p-4 rounded-xl text-left bg-gray-800 border-2 border-gray-700 hover:border-purple-400 hover:bg-gray-750 cursor-pointer transition-all"
            >
              <div className="text-2xl mb-2">🃏</div>
              <div className="font-semibold text-sm">{char.nameZh}</div>
              <div className="text-xs text-gray-500">{char.nameEn}</div>
              <div className="text-xs text-gray-400 mt-2 leading-relaxed">{char.abilityDesc}</div>
            </button>
          ))}
        </div>

        {/* 玩家选择进度 */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {players.map(p => {
            const picks = store.state.draftPicks.get(p.id) ?? []
            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg text-sm ${
                  p.id === players[currentPicker]?.id ? 'bg-purple-900/40 ring-2 ring-purple-500' : 'bg-gray-800'
                }`}
              >
                <div className="font-semibold truncate">{p.nickname}</div>
                <div className="text-xs text-gray-400">
                  {picks.length}/{picksPerPlayer}
                </div>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {picks.map(c => (
                    <span key={c.id} className="text-[10px] bg-gray-700 px-1 rounded">{c.nameZh[0]}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
