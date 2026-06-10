import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LeagueManagement from './pages/LeagueManagement.jsx'
import RosterAnalysis from './pages/RosterAnalysis.jsx'
import WaiverWire from './pages/WaiverWire.jsx'
import TradeAnalyzer from './pages/TradeAnalyzer.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leagues" element={<LeagueManagement />} />
        <Route path="/roster" element={<RosterAnalysis />} />
        <Route path="/waiver" element={<WaiverWire />} />
        <Route path="/trade" element={<TradeAnalyzer />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
