import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { rollD6 } from '../lib/dice'
import { getTrackSpaces } from '../lib/trackData'
import type { TrackSpace } from '../lib/types'

// 模拟参赛者
const MOCK_RACERS = [
  { id: 'p1', name: '玩家1', character: '炼金术士', position: 0, color: 'bg-red-500' },
  { id: 'p2', name: '玩家2', character: '半人马', position: 0, color: 'bg-blue-500' },
  { id: 'p3', name: '玩家3', character: '香蕉', position: 0, color: 'bg-green-500' },
  { id: 'p4', name: '玩家4', character: '大长腿', position: 0, color: 'bg-yellow-500' },
]

interface LogEntry {
  id: number
  text: string
  time: string
}

export default function GamePage() {
  const { gameId } = useParams()
  const [racers, setRacers] = useState(MOCK_RACERS)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [raceNumber] = useState(1)
  const track = getTrackSpaces(raceNumber % 2 === 0 ? 'mild' : 'wild')

  const addLog = useCallback((text: string) => {
    setLogs(prev => [{
      id: Date.now(),
      text,
      time: new Date().toLocaleTimeString(),
    }, ...prev.slice(0, 49)])
  }, [])

  function handleRoll() {
    if (isRolling) return
    setIsRolling(true)

    // 骰子动画
    let count = 0
    const interval = setInterval(() => {
      setDiceValue(rollD6())
      count++
      if (count >= 10) {
        clearInterval(interval)
        const finalValue = rollD6()
        setDiceValue(finalValue)
        setIsRolling(false)

        // 移动当前玩家
        const newRacers = [...racers]
        const racer = newRacers[currentTurn]
        const oldPos = racer.position
        racer.position = Math.min(oldPos + finalValue, 30)
        addLog(`🎲 ${racer.name} 掷出 ${finalValue}，从 ${oldPos} 移动到 ${racer.position}`)

        // 检查赛道效果
        const space = track[racer.position]
        if (space.hasStar) addLog(`⭐ ${racer.name} 获得 1 铜分！`)
        if (space.hasTrip) addLog(`🪨 ${racer.name} 被绊倒了！下次跳过。`)
        if (space.hasArrow) addLog(`➡️ ${racer.name} 触发箭头移动 ${space.arrowDistance} 格`)
        if (space.isFinish) addLog(`🏁 ${racer.name} 冲线！`)

        setRacers(newRacers)
        setCurrentTurn((currentTurn + 1) % racers.length)
      }
    }, 80)
  }

  const trackSide = raceNumber % 2 === 0 ? 'mild' : 'wild'

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部信息栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-400">第 {raceNumber}/4 场 · </span>
          <span className="text-sm font-semibold">{trackSide === 'mild' ? '🌿 Mild' : '🔥 Wild'}</span>
        </div>
        <div className="text-sm text-gray-500">房间: {gameId?.slice(0, 8)}...</div>
      </div>

      <div className="flex-1 flex gap-0">
        {/* 赛道 */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">🏁 赛道</h2>

            {/* 横向赛道 */}
            <div className="bg-gray-800 rounded-xl p-4 overflow-x-auto">
              <div className="flex gap-1 min-w-[960px]">
                {track.map((space: TrackSpace) => (
                  <TrackCell
                    key={space.spaceIndex}
                    space={space}
                    racers={racers.filter(r => r.position === space.spaceIndex)}
                  />
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>⭐ 星星</span>
              <span>🪨 绊倒</span>
              <span>➡️ 箭头</span>
              <span>🏁 终点</span>
            </div>
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* 当前玩家 */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-xs text-gray-500 mb-1">当前回合</div>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${racers[currentTurn].color}`} />
              <span className="font-semibold">{racers[currentTurn].name}</span>
              <span className="text-sm text-gray-400">({racers[currentTurn].character})</span>
            </div>

            {/* 骰子 */}
            <div className="text-center mb-3">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl text-4xl font-bold transition-all ${
                isRolling ? 'bg-purple-600 animate-pulse' : 'bg-gray-700'
              }`}>
                {diceValue ?? '?'}
              </div>
            </div>

            <button
              onClick={handleRoll}
              disabled={isRolling}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {isRolling ? '🎲 掷骰中...' : '🎲 掷骰子'}
            </button>
          </div>

          {/* 玩家列表 */}
          <div className="p-4 border-b border-gray-700">
            <div className="text-xs text-gray-500 mb-2">参赛者</div>
            <div className="space-y-2">
              {racers.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    i === currentTurn ? 'bg-purple-900/30 ring-1 ring-purple-500' : 'bg-gray-750'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${r.color}`} />
                  <span className="text-sm flex-1">{r.name}</span>
                  <span className="text-xs text-gray-400">格{r.position}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 事件日志 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">事件日志</div>
            <div className="space-y-1">
              {logs.length === 0 && (
                <div className="text-sm text-gray-600">等待比赛开始...</div>
              )}
              {logs.map(log => (
                <div key={log.id} className="text-xs text-gray-400 py-1 border-b border-gray-750">
                  <span className="text-gray-600 mr-2">{log.time}</span>
                  {log.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 单个赛道格 */
function TrackCell({ space, racers }: { space: TrackSpace; racers: typeof MOCK_RACERS }) {
  let bg = 'bg-gray-700'
  let label = ''

  if (space.isFinish) {
    bg = 'bg-yellow-900/50'
    label = '🏁'
  } else if (space.hasStar) {
    bg = 'bg-yellow-800/30'
    label = '⭐'
  } else if (space.hasTrip) {
    bg = 'bg-red-900/30'
    label = '🪨'
  } else if (space.hasArrow) {
    bg = space.arrowDirection === 'forward' ? 'bg-blue-900/30' : 'bg-orange-900/30'
    label = space.arrowDirection === 'forward' ? `➡${space.arrowDistance}` : `⬅${space.arrowDistance}`
  } else if (space.spaceIndex === 0) {
    bg = 'bg-green-900/30'
    label = '🚩'
  }

  return (
    <div className={`relative flex-shrink-0 w-8 h-24 ${bg} rounded flex flex-col items-center justify-between py-1`}>
      {/* 格子标签 */}
      <span className="text-[8px] text-gray-500">{label || space.spaceIndex}</span>

      {/* 赛车手 */}
      <div className="flex flex-col gap-0.5">
        {racers.map(r => (
          <div
            key={r.id}
            className={`w-5 h-5 ${r.color} rounded-full border border-white/20`}
            title={`${r.name} (${r.character})`}
          />
        ))}
      </div>
    </div>
  )
}
