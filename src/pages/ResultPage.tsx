import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/StoreContext'
import { GOLD_VALUES, SILVER_VALUES } from '../lib/types'

export default function ResultPage() {
  const navigate = useNavigate()
  const store = useStore()
  const ranking = store.getRanking()
  const winner = ranking[0]

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']
  const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600', 'text-gray-500', 'text-gray-500', 'text-gray-500']

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10 mt-6">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold mb-1">{winner.player.nickname} 获胜！</h1>
          <p className="text-gray-400">
            总分 {winner.total} 分
            <span className="text-sm ml-2">(🥇{winner.gold} 🥈{winner.silver} ⭐{winner.bronze})</span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">最终排名</h2>
          <div className="space-y-3">
            {ranking.map((r, i) => (
              <div key={r.player.id}
                className={`flex items-center gap-4 p-4 rounded-xl ${i === 0 ? 'bg-yellow-900/20 border border-yellow-700/50' : 'bg-gray-750'}`}>
                <span className={`text-2xl ${colors[i]}`}>{medals[i]}</span>
                <span className="flex-1 font-semibold">{r.player.nickname}</span>
                <div className="flex gap-3 text-sm">
                  <span className="text-yellow-400">🥇{r.gold}</span>
                  <span className="text-gray-300">🥈{r.silver}</span>
                  <span className="text-amber-600">⭐{r.bronze}</span>
                </div>
                <span className="text-lg font-bold w-12 text-right">{r.total}</span>
              </div>
            ))}
          </div>
        </div>

        {store.state.raceResults.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">比赛详情</h2>
            <div className="space-y-2">
              {store.state.raceResults.map(race => {
                const track = race.raceNumber % 2 === 0 ? 'Wild' : 'Mild'
                const gp = GOLD_VALUES[race.raceNumber - 1]
                const sp = SILVER_VALUES[race.raceNumber - 1]
                const first = store.state.players.find(p => p.id === race.firstPlace)
                const second = store.state.players.find(p => p.id === race.secondPlace)
                return (
                  <div key={race.raceNumber} className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg text-sm">
                    <span className="text-gray-500 w-16">第{race.raceNumber}场</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${track === 'Mild' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{track}</span>
                    <span className="text-yellow-400">🥇 {first?.nickname ?? '?'} ({gp}分)</span>
                    <span className="text-gray-300">🥈 {second?.nickname ?? '?'} ({sp}分)</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/')} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors">
          🎮 再来一局
        </button>
      </div>
    </div>
  )
}
