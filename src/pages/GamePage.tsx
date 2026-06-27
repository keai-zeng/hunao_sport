import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/StoreContext'
import { getTrackSpaces } from '../lib/trackData'
import type { GameEvent, TrackSpace } from '../lib/types'

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500', 'bg-cyan-500']

export default function GamePage() {
  const navigate = useNavigate()
  const store = useStore()
  const [events, setEvents] = useState<GameEvent[]>([])
  const [diceAnim, setDiceAnim] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [phase, setPhase] = useState<'selecting' | 'racing' | 'ended'>(
    store.state.status === 'selecting_racer' ? 'selecting' : 'racing'
  )

  const players = store.state.players
  const trackSide = store.state.trackSide
  const track = getTrackSpaces(trackSide)
  const raceNum = store.state.currentRace

  // 赛前选人：简单自动分配（后续可改为手动选择）
  useEffect(() => {
    if (phase === 'selecting') {
      for (const p of players) {
        const picks = store.state.draftPicks.get(p.id) ?? []
        const unused = picks.filter(() => {
          // 简单实现：选第一个未用过的
          return !store.state.raceParticipants.some(rp => rp.playerId === p.id)
        })
        if (unused.length > 0) {
          store.selectRacer(p.id, unused[0].id)
        }
      }
      setPhase('racing')
    }
  }, [phase, players, store])

  // 检查比赛结束
  useEffect(() => {
    if (store.state.status === 'race_end' || store.state.status === 'finished') {
      setPhase('ended')
    }
  }, [store.state.status])

  const handleRoll = useCallback(() => {
    if (rolling || phase !== 'racing') return
    setRolling(true)

    // 骰子动画
    let count = 0
    const interval = setInterval(() => {
      setDiceAnim(Math.floor(Math.random() * 6) + 1)
      count++
      if (count >= 10) {
        clearInterval(interval)
        // 执行真实回合
        const result = store.executeCurrentTurn()
        setDiceAnim(null)
        setRolling(false)
        setEvents(store.state.events)

        if (result.raceFinished) {
          setPhase('ended')
        }
      }
    }, 80)
  }, [rolling, phase, store])

  const currentPlayer = players[store.state.currentPlayerIndex]

  // 比赛结束 → 下一场或结果
  if (phase === 'ended' && store.state.status === 'race_end') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="text-3xl font-bold mb-2">第 {raceNum} 场比赛结束</h1>

        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md my-6">
          {store.state.raceParticipants
            .filter(p => p.finishOrder)
            .sort((a, b) => (a.finishOrder ?? 99) - (b.finishOrder ?? 99))
            .map(p => {
              const pl = players.find(pl => pl.id === p.playerId)
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg mb-2">
                  <span className="text-2xl">{p.finishOrder === 1 ? '🥇' : '🥈'}</span>
                  <span className="font-semibold">{pl?.nickname}</span>
                  <span className="text-sm text-gray-400">({p.character.nameZh})</span>
                </div>
              )
            })}
        </div>

        {raceNum < 4 ? (
          <button
            onClick={() => {
              store.startNextRace()
              setPhase('selecting')
              setEvents([])
            }}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition-colors"
          >
            ▶️ 第 {raceNum + 1} 场比赛
          </button>
        ) : (
          <button
            onClick={() => navigate('/result/local')}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition-colors"
          >
            🏆 查看最终结果
          </button>
        )}
      </div>
    )
  }

  // 全部结束
  if (store.state.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-6">全部比赛结束！</h1>
        <button
          onClick={() => navigate('/result/local')}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-lg transition-colors"
        >
          🏆 查看最终结果
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-400">第 {raceNum}/4 场 · </span>
          <span className="text-sm font-semibold">
            {trackSide === 'mild' ? '🌿 Mild 温和英里' : '🔥 Wild 狂野赛道'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          回合: {currentPlayer?.nickname}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 赛道区域 */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-xl p-4 overflow-x-auto">
              <div className="flex gap-1" style={{ minWidth: track.length * 36 }}>
                {track.map((space: TrackSpace) => (
                  <TrackCell
                    key={space.spaceIndex}
                    space={space}
                    racers={store.state.raceParticipants.filter(
                      r => r.position === space.spaceIndex
                    )}
                    players={players}
                  />
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>⭐ +1铜分</span>
              <span>🪨 绊倒</span>
              <span>➡️ 箭头</span>
              <span>🏁 终点</span>
            </div>
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
          {/* 当前玩家 + 骰子 */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-xs text-gray-500 mb-1">当前回合</div>
            <div className="text-lg font-bold mb-3">
              {currentPlayer?.nickname}
              <span className="text-sm text-gray-400 font-normal ml-2">
                ({store.state.raceParticipants.find(
                  p => p.playerId === currentPlayer?.id
                )?.character.nameZh ?? '?'})
              </span>
            </div>

            <div className="text-center mb-3">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl text-4xl font-bold transition-all ${
                rolling ? 'bg-purple-600 animate-pulse scale-110' : 'bg-gray-700'
              }`}>
                {diceAnim ?? '🎲'}
              </div>
            </div>

            <button
              onClick={handleRoll}
              disabled={rolling}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {rolling ? '掷骰中...' : '🎲 掷骰子'}
            </button>
          </div>

          {/* 参赛者列表 */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-xs text-gray-500 mb-2">参赛者</div>
            <div className="space-y-1.5">
              {store.state.raceParticipants.map((rp, i) => {
                const pl = players.find(p => p.id === rp.playerId)
                const isCurrent = rp.playerId === currentPlayer?.id
                const color = COLORS[i % COLORS.length]
                return (
                  <div
                    key={rp.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      isCurrent ? 'bg-purple-900/30 ring-1 ring-purple-500' : 'bg-gray-750'
                    } ${rp.isEliminated ? 'opacity-40 line-through' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                    <span className="flex-1 truncate">{pl?.nickname}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {rp.finishOrder === 1 ? '🥇' : rp.finishOrder === 2 ? '🥈' : `格${rp.position}`}
                    </span>
                    {rp.isTripped && <span className="text-xs">🪨</span>}
                    {rp.isEliminated && <span className="text-xs">💀</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 事件日志 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">事件日志</div>
            <div className="space-y-1">
              {events.length === 0 && (
                <div className="text-sm text-gray-600">等待掷骰...</div>
              )}
              {[...events].reverse().slice(0, 30).map((e, i) => {
                const src = players.find(p => p.id === e.sourcePlayerId)
                const tgt = e.targetPlayerId ? players.find(p => p.id === e.targetPlayerId) : null
                return (
                  <div key={i} className="text-xs text-gray-400 py-1 border-b border-gray-750/50">
                    <span className="text-gray-600">{e.type}</span>{' '}
                    {src?.nickname ?? '?'}
                    {tgt ? ` → ${tgt.nickname}` : ''}
                    {e.payload.effectType ? ` (${e.payload.effectType})` : ''}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackCell({ space, racers, players }: {
  space: TrackSpace
  racers: { playerId: string; character: { nameZh: string } }[]
  players: { id: string; nickname: string }[]
}) {
  let bg = 'bg-gray-700'
  let label = ''

  if (space.isFinish) { bg = 'bg-yellow-900/50'; label = '🏁' }
  else if (space.hasStar) { bg = 'bg-yellow-800/30'; label = '⭐' }
  else if (space.hasTrip) { bg = 'bg-red-900/30'; label = '🪨' }
  else if (space.hasArrow) {
    bg = space.arrowDirection === 'forward' ? 'bg-blue-900/30' : 'bg-orange-900/30'
    label = space.arrowDirection === 'forward' ? `➡${space.arrowDistance}` : `⬅${space.arrowDistance}`
  }
  else if (space.spaceIndex === 0) { bg = 'bg-green-900/30'; label = '🚩' }

  return (
    <div className={`relative flex-shrink-0 w-8 h-28 ${bg} rounded flex flex-col items-center justify-between py-0.5`}>
      <span className="text-[8px] text-gray-500 leading-none">{label || space.spaceIndex}</span>
      <div className="flex flex-col gap-0.5">
        {racers.map((r, i) => {
          const pl = players.find(p => p.id === r.playerId)
          return (
            <div
              key={r.playerId}
              className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-bold"
              style={{ backgroundColor: ['#ef4444','#3b82f6','#22c55e','#eab308','#ec4899','#06b6d4'][i % 6] }}
              title={`${pl?.nickname} (${r.character.nameZh})`}
            >
              {pl?.nickname[0]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
