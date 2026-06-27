import { useNavigate } from 'react-router-dom'

// 模拟比赛结果
const MOCK_RESULTS = {
  races: [
    { raceNumber: 1, track: 'Mild', gold: { name: '玩家3', points: 3 }, silver: { name: '玩家1', points: 1 } },
    { raceNumber: 2, track: 'Wild', gold: { name: '玩家1', points: 4 }, silver: { name: '玩家4', points: 2 } },
    { raceNumber: 3, track: 'Mild', gold: { name: '玩家2', points: 4 }, silver: { name: '玩家3', points: 2 } },
    { raceNumber: 4, track: 'Wild', gold: { name: '玩家1', points: 5 }, silver: { name: '玩家2', points: 3 } },
  ],
  totals: [
    { name: '玩家1', gold: 9, silver: 1, bronze: 3, total: 13 },
    { name: '玩家3', gold: 3, silver: 2, bronze: 2, total: 7 },
    { name: '玩家2', gold: 4, silver: 3, bronze: 0, total: 7 },
    { name: '玩家4', gold: 0, silver: 2, bronze: 1, total: 3 },
  ],
}

export default function ResultPage() {
  const navigate = useNavigate()
  const results = MOCK_RESULTS
  const winner = results.totals[0]

  const medals = ['🥇', '🥈', '🥉', '4']
  const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600', 'text-gray-500']

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        {/* 冠军 */}
        <div className="text-center mb-10 mt-6">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold mb-1">{winner.name} 获胜！</h1>
          <p className="text-gray-400">总分 {winner.total} 分</p>
        </div>

        {/* 排名 */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">最终排名</h2>
          <div className="space-y-3">
            {results.totals.map((p, i) => (
              <div
                key={p.name}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  i === 0 ? 'bg-yellow-900/20 border border-yellow-700/50' : 'bg-gray-750'
                }`}
              >
                <span className={`text-2xl ${colors[i]}`}>{medals[i]}</span>
                <span className="flex-1 font-semibold">{p.name}</span>
                <div className="flex gap-3 text-sm">
                  <span className="text-yellow-400">🥇{p.gold}</span>
                  <span className="text-gray-300">🥈{p.silver}</span>
                  <span className="text-amber-600">⭐{p.bronze}</span>
                </div>
                <span className="text-lg font-bold w-12 text-right">{p.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 每场比赛详情 */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">比赛详情</h2>
          <div className="space-y-2">
            {results.races.map(race => (
              <div key={race.raceNumber} className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg text-sm">
                <span className="text-gray-500 w-16">第{race.raceNumber}场</span>
                <span className={`px-2 py-0.5 rounded text-xs ${race.track === 'Mild' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {race.track}
                </span>
                <span className="text-yellow-400">🥇 {race.gold.name} ({race.gold.points}分)</span>
                <span className="text-gray-300">🥈 {race.silver.name} ({race.silver.points}分)</span>
              </div>
            ))}
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors"
          >
            🎮 再来一局
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            🏠 返回大厅
          </button>
        </div>
      </div>
    </div>
  )
}
