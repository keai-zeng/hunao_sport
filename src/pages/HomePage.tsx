import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/StoreContext'

export default function HomePage() {
  const navigate = useNavigate()
  const store = useStore()
  const [nickname, setNickname] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [step, setStep] = useState<'setup' | 'adding' | 'ready'>('setup')
  const [playerCount, setPlayerCount] = useState(4)

  function startSetup() {
    store.state.players = []
    store.state.draftPicks = new Map()
    setPlayers([])
    setStep('adding')
  }

  function addPlayer() {
    if (!nickname.trim()) return
    store.addPlayer(nickname.trim())
    setPlayers(prev => [...prev, nickname.trim()])
    setNickname('')

    if (players.length + 1 >= playerCount) {
      setStep('ready')
    }
  }

  function startGame() {
    store.startDraft()
    navigate('/draft/local')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3">🎮 胡闹运动会</h1>
        <p className="text-gray-400 text-lg">本地热座模式</p>
      </div>

      {step === 'setup' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-3">玩家人数</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-3 rounded-lg text-lg font-semibold transition-colors ${
                    playerCount === n
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {n}人
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={startSetup}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors"
          >
            🎲 开始本地游戏
          </button>
        </div>
      )}

      {step === 'adding' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">添加玩家</h2>
            <span className="text-sm text-gray-400">{players.length}/{playerCount}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              placeholder={`玩家${players.length + 1} 昵称...`}
              maxLength={12}
              className="flex-1 px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
              autoFocus
            />
            <button
              onClick={addPlayer}
              disabled={!nickname.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              加入
            </button>
          </div>

          {players.length > 0 && (
            <div className="space-y-2 mt-4">
              {players.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                  <span className="text-gray-500 text-sm">#{i + 1}</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'ready' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6 text-center">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="text-xl font-semibold">{playerCount} 位玩家就绪</h2>

          <div className="space-y-2 text-left">
            {players.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-sm">#{i + 1}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors text-lg"
          >
            🃏 开始轮抽选角
          </button>

          <button
            onClick={() => setStep('setup')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-400"
          >
            重新设置
          </button>
        </div>
      )}
    </div>
  )
}
