import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DraftPage from './pages/DraftPage'
import GamePage from './pages/GamePage'
import ResultPage from './pages/ResultPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/draft/:gameId" element={<DraftPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/result/:gameId" element={<ResultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
